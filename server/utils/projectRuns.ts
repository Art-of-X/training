import { prisma } from '~/server/utils/prisma'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createAnalyzeLinkTool, createDocumentProcessingTool } from '~/server/utils/ai-tools'

type RunEvent = { type: string; payload?: any }

async function emit(runId: string, event: RunEvent) {
  try {
    await prisma.projectRunEvent.create({ data: { runId, type: event.type, payload: event.payload || {} } })
  } catch (e) {
    // best-effort
  }
}

export async function processProjectRun(runId: string) {
  const run = await prisma.projectRun.findUnique({
    where: { id: runId },
    include: {
      project: { include: { contextItems: true, sparks: { include: { spark: true } } } },
      user: true,
    },
  })
  if (!run) return
  const project = run.project
  const user = run.user

  if (!project.task || project.sparks.length === 0) {
    await prisma.projectRun.update({ where: { id: runId }, data: { status: 'error', finishedAt: new Date(), summary: 'No task or no sparks' } })
    return
  }

  await emit(runId, { type: 'run:started', payload: { projectId: project.id, task: project.task } })

  const assignedSparks = project.sparks.map(s => s.spark)
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const tools = {
    analyzeLink: createAnalyzeLinkTool(user.id),
    documentProcessing: createDocumentProcessingTool(user.id),
  } as const

  const structuredContext = project.contextItems.map((item) => ({
    id: item.id,
    description: item.description || '',
    link: item.link || undefined,
    filePath: item.filePath || undefined,
    text: item.text || undefined,
  }))

  // Parallel ideation with small concurrency
  const concurrency = 3
  const queue = [...assignedSparks]
  const ideations: { sparkId: string; sparkName: string; text: string }[] = []

  async function worker() {
    const spark = queue.shift()
    if (!spark) return
    await emit(runId, { type: 'agent:started', payload: { sparkId: spark.id, name: spark.name } })
    try {
      const { text } = await generateText({
        model: openai('gpt-4.1-mini'),
        system: spark.systemPrompt,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `You are collaborating with other domain experts to solve a project task. First, think independently and propose concise solution ideas before any group coordination.` },
            { type: 'text', text: `Task: ${project.task}` },
            { type: 'text', text: `Context items (links, files, or text) are provided below. Use the available tools when helpful to analyze them: 1) analyzeLink(url) for web links, 2) documentProcessing(fileUrl, context) for files. If text is present, read it directly.` },
            { type: 'text', text: `Context JSON: ${JSON.stringify(structuredContext).substring(0, 7500)}` },
            { type: 'text', text: `Instructions: Propose 2-3 distinct solution ideas specific to the task. Numbered list, each under 120 words.` },
          ],
        }],
        tools,
        maxSteps: 6,
        temperature: 0.8,
      })
      ideations.push({ sparkId: spark.id, sparkName: spark.name, text })
      await emit(runId, { type: 'agent:result', payload: { sparkId: spark.id, name: spark.name, text } })
    } catch (e: any) {
      await emit(runId, { type: 'agent:error', payload: { sparkId: spark.id, name: spark.name, error: e?.message || 'Failed to ideate' } })
    } finally {
      await emit(runId, { type: 'agent:finished', payload: { sparkId: spark.id, name: spark.name } })
      await worker()
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()))

  await emit(runId, { type: 'coordination:started' })
  let consolidated = ''
  try {
    const { text } = await generateText({
      model: openai('gpt-4.1-mini'),
      system: `You are a neutral coordinator synthesizing proposals from multiple expert agents. Consolidate and produce the strongest, diverse options.`,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Task: ${project.task}` },
          { type: 'text', text: `Agent proposals as JSON array of {sparkName, text}.` },
          { type: 'text', text: JSON.stringify(ideations).substring(0, 12000) },
          { type: 'text', text: `Output strictly as a numbered list of 4-5 proposals.` },
        ],
      }],
      temperature: 0.7,
    })
    consolidated = text
    await emit(runId, { type: 'coordination:result', payload: { text } })
  } catch (e: any) {
    await emit(runId, { type: 'coordination:error', payload: { error: e?.message || 'Failed to consolidate' } })
  }

  await emit(runId, { type: 'outputs:saving' })
  const outputsText = (consolidated && consolidated.trim()) ? consolidated : ideations.map(i => i.text).join('\n')
  let proposals = outputsText.split(/\n\s*(?:\d+\.|-\s)\s+/).map(s => s.trim()).filter(Boolean)
  if (proposals.length > 5 || proposals.length < 2) {
    const alt = outputsText.split(/\n\n+/).map(s => s.trim()).filter(Boolean)
    if (alt.length >= 2) proposals = alt
  }
  const chosen = proposals.slice(0, 5)

  const attributionSparkId = assignedSparks[0]?.id
  for (const text of chosen) {
    try {
      const created = await prisma.output.create({
        data: { projectId: project.id, sparkId: attributionSparkId, text, runId },
        include: { spark: true },
      })
      await emit(runId, { type: 'output:created', payload: { id: created.id, text: created.text, sparkId: created.sparkId, sparkName: created.spark.name } })
    } catch (e) {
      await emit(runId, { type: 'outputs:error', payload: { error: (e as any)?.message || 'Failed to save output' } })
    }
  }

  await prisma.projectRun.update({ where: { id: runId }, data: { status: 'finished', finishedAt: new Date() } })
  await emit(runId, { type: 'outputs:saved', payload: { count: chosen.length } })
  await emit(runId, { type: 'run:finished' })
}


