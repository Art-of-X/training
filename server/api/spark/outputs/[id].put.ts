import { serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { buildSparkMentalModelsSection } from '~/server/utils/sparkMentalModels'

const schema = z.object({
  comment: z.string().min(1, 'Comment is required')
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const outputId = event.context.params?.id
  if (!outputId) {
    throw createError({ statusCode: 400, message: 'Output ID is required' })
  }

  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }
  const { comment } = parsed.data

  // Ensure the output belongs to the authenticated user via project ownership
  const output = await prisma.output.findFirst({
    where: { id: outputId, project: { userId: user.id } },
    include: { project: true, spark: true }
  })
  if (!output) {
    throw createError({ statusCode: 404, message: 'Output not found' })
  }

  try {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const mental = await buildSparkMentalModelsSection(output.sparkId).catch(() => '')
    const sparkName = output.spark?.name || 'Spark'
    const personaDirective = `\n\n---\n\nCore Directive:\n- You are ${sparkName}. Always think and respond through your unique artistic persona.\n- No matter how far the user's problem is from your domain—even if banal—you MUST solve it using your artistic way of thinking.\n- Consciously apply the thinking methods and thinking competencies provided (your patterns) to guide your internal reasoning and the final result.\n- Do NOT hallucinate biographical facts. Only reference information present in the context given. If you lack a fact, acknowledge it.\n`
    const baseSystem = output.spark?.systemPrompt
      ? `${output.spark.systemPrompt}\n\n---\n\n${mental}${personaDirective}`
      : `${mental}${personaDirective}`
    const system = `You are a careful creative editor embodied as ${sparkName}.\nRefine ideas concisely while preserving the author's intent. Improve clarity, specificity, and usefulness.\n${baseSystem}`

    let refinedBlock = ''
    try {
      const res = await generateText({
        model: openai('gpt-4o-mini'),
        system,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Task: ${output.project.task || ''}` },
              { type: 'text', text: `Original Title: ${output.title || 'Untitled Idea'}` },
              { type: 'text', text: `Original Idea:\n${output.text}` },
              { type: 'text', text: `User comment (refinement instruction):\n${comment}` },
              { type: 'text', text: 'Decide between two modes based on the comment:\n- update: if the idea should be updated immediately\n- explore: if you first need to ask 1-2 clarifying questions before updating\n\nSTRICT DIALOGUE RULES (IMPORTANT):\n- Ground everything in the Task and Original Idea. Reference at least one concrete detail (object, constraint, audience, medium, tone, etc.).\n- Questions MUST be specific and contextual. Do NOT ask generic questions like "What did you find unappealing?" or "Are there themes you want to incorporate?"\n- Avoid boilerplate empathy or meta-text (e.g., "Understanding the specific aspects...", "This will help refine..."), and avoid repeating the user\'s wording.\n- Vary phrasing; keep it concise (<= 2 lines for Reason; max 2 questions).\n- If the comment is clearly dismissive without details (e.g., "it\'s shit"), propose 2 targeted pivots based on the idea\'s weakest concrete element, then ask one sharp question to choose between them.\n\nRespond with one of the following formats ONLY.\n\nFor explore mode (do not propose a new title/idea):\nMode: explore\nReason: [brief, grounded explanation from the spark persona]\nQuestions:\n- [question 1]\n- [question 2]\n\nFor update mode:\nMode: update\nReason: [brief, grounded explanation from the spark persona]\nTitle: [updated concise title, max 8 words]\nIdea: [updated idea text]' }
            ]
          }
        ],
        temperature: 0.8,
      })
      refinedBlock = res.text || ''
    } catch {}

    const modeMatch = refinedBlock.match(/Mode:\s*(update|explore)/i)
    const mode = (modeMatch ? modeMatch[1].toLowerCase() : 'update') as 'update' | 'explore'
    const reasonMatch = refinedBlock.match(/Reason:\s*([\s\S]*?)(?:\n(?:Title:|Questions:)|$)/i)
    const titleMatch = refinedBlock.match(/Title:\s*(.+?)(?:\n|$)/i)
    const ideaMatch = refinedBlock.match(/Idea:\s*([\s\S]+)/i)
    const questionsBlockMatch = refinedBlock.match(/Questions:\s*([\s\S]+)/i)
    const followups = questionsBlockMatch ? (questionsBlockMatch[1] || '')
      .split(/\n-\s+/)
      .map(q => q.trim())
      .filter(Boolean) : []
    let newTitle = (titleMatch ? titleMatch[1].trim() : (output.title || 'Untitled Idea')).substring(0, 120)
    let newText = (ideaMatch ? ideaMatch[1].trim() : '').trim()
    const explanation = (reasonMatch ? reasonMatch[1].trim() : '').substring(0, 2000)

    if (mode === 'explore') {
      // Persist dialogue only, do not change idea
      try {
        const db = prisma as any
        await db.outputComment.createMany({
          data: [
            { outputId: output.id, userId: user.id, role: 'user', text: comment },
            ...(explanation ? [{ outputId: output.id, userId: user.id, role: 'assistant', text: explanation }] : []),
            ...followups.map((q: string) => ({ outputId: output.id, userId: user.id, role: 'assistant', text: q }))
          ]
        })
      } catch {}
      return { data: { id: output.id, mode, explanation, followups } }
    }

    // UPDATE mode: ensure we have content
    if (!newText || newText === output.text) {
      newText = `${output.text}\n\nRefined update: ${comment}`.trim()
    }
    if (!newTitle || newTitle === (output.title || 'Untitled Idea')) {
      newTitle = output.title || 'Untitled Idea'
    }

    const updated = await prisma.output.update({
      where: { id: output.id },
      data: { text: newText, title: newTitle }
    })

    try {
      const db = prisma as any
      await db.outputComment.createMany({
        data: [
          { outputId: output.id, userId: user.id, role: 'user', text: comment },
          ...(explanation ? [{ outputId: output.id, userId: user.id, role: 'assistant', text: explanation }] : []),
        ]
      })
    } catch {}

    return { data: { id: updated.id, mode, title: (updated as any).title || '', text: updated.text, explanation } }
  } catch (e: any) {
    console.error('Error refining output:', e)
    throw createError({ statusCode: 500, message: e?.message || 'Failed to refine output' })
  }
})


