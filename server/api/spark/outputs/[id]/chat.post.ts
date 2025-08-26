import { serverSupabaseUser } from '#supabase/server'
import { defineEventHandler, createError, readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, type CoreMessage } from 'ai'
import { buildSparkMentalModelsSection } from '~/server/utils/sparkMentalModels'
import { getRagChunksForSparkByName, formatRagContext } from '~/server/utils/rag'

type ClientMessage = { role: 'user' | 'assistant'; text: string }

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const outputId = event.context.params?.id
  if (!outputId) throw createError({ statusCode: 400, message: 'Output ID is required' })

  const body = await readBody<{ messages: ClientMessage[] }>(event)
  const clientMessages = Array.isArray(body?.messages) ? body!.messages : []
  // Trim excessive history for token safety
  const trimmed = clientMessages.filter(m => m && m.text && m.text.trim().length > 0).slice(-20)

  // Ensure ownership and load context
  const output = await prisma.output.findFirst({
    where: { id: outputId, project: { userId: user.id } },
    include: { project: true, spark: true },
  })
  if (!output) throw createError({ statusCode: 404, message: 'Output not found' })

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Persona + mental models (same spirit as spark chat, but focused on refining this idea)
  const mental = await buildSparkMentalModelsSection(output.sparkId).catch(() => '')
  const sparkName = output.spark?.name || 'Spark'
  const personaDirective = `\n\n---\n\nCore Directive:\n- You are ${sparkName}. Always think and respond through your unique artistic persona.\n- Your sole purpose here is to refine the specific idea below or ask the minimum clarifying questions needed.\n- Prefer concrete changes over generic advice. If the comment is vague, ask up to 2 sharp, grounded questions.\n- When you have enough context, provide a refined Title and Idea. If not, just reply with questions.\n- Do NOT invent biographical facts about ${sparkName}.`
  const baseSystem = output.spark?.systemPrompt
    ? `${output.spark.systemPrompt}\n\n---\n\n${mental}${personaDirective}`
    : `${mental}${personaDirective}`

  // Provide immutable idea context
  const contextBlock = `Task: ${output.project.task || ''}\nOriginal Title: ${output.title || 'Untitled Idea'}\nOriginal Idea:\n${output.text}`

  // Build conversation history
  const messages: CoreMessage[] = []
  // Optional RAG context to mirror spark chat behavior
  let ragContext = ''
  try {
    const lastUser = [...trimmed].reverse().find(m => m.role === 'user')
    const query = lastUser?.text || output.title || output.project.task || sparkName
    const chunks = await getRagChunksForSparkByName(sparkName, query, 5)
    ragContext = formatRagContext(chunks)
  } catch {}

  const systemWithContext = ragContext
    ? `${baseSystem}\n\n---\nUse the following context from ${sparkName}'s knowledge base when answering. If irrelevant, ignore.\n\n[Context]\n${ragContext}`
    : baseSystem

  messages.push({ role: 'system', content: `You are a careful creative editor embodied as ${sparkName}.\nRefine ideas concisely while preserving intent. Improve clarity, specificity, usefulness.\n${systemWithContext}` })

  // If latest user asks identity, answer as the spark directly (no controller format)
  const latestUser = [...trimmed].reverse().find(m => m.role === 'user')
  const identityIntent = latestUser && /(\bwho\s+are\s+you\b|\bwho\s*r\s*u\b|\bintroduce\s+yourself\b|\bwhat\s+are\s+you\b)/i.test(latestUser.text)
  if (identityIntent) {
    try {
      const intro = await generateText({
        model: openai('gpt-4o-mini'),
        system: systemWithContext,
        prompt: `Introduce yourself as ${sparkName} in 2-3 sentences, reflecting your artistic identity and approach.`,
        temperature: 1,
      })
      const reply = (intro.text || '').trim()
      try {
        const db = prisma as any
        const toCreate: any[] = []
        if (latestUser?.text) toCreate.push({ outputId: output.id, userId: user.id, role: 'user', text: latestUser.text })
        if (reply) toCreate.push({ outputId: output.id, userId: user.id, role: 'assistant', text: reply })
        if (toCreate.length > 0) await db.outputComment.createMany({ data: toCreate })
      } catch {}
      return { data: { mode: 'explore', message: reply } }
    } catch (e: any) {
      return { data: { mode: 'explore', message: `I'm ${sparkName}.` } }
    }
  }
  messages.push({ role: 'system', content: contextBlock })
  for (const m of trimmed) {
    messages.push({ role: m.role, content: m.text })
  }

  // Instruction: structured output when deciding to update
  const controller = {
    role: 'user' as const,
    content: `Decide between two modes based on the latest user message:\n- update: if the idea should be updated immediately\n- explore: if you first need to ask 1-2 clarifying questions before updating\n\nSTRICT RULES:\n- Ground questions in the Task/Original Idea (reference concrete details).\n- Avoid boilerplate like "Understanding the specific aspects…" or generic "What did you find unappealing?"\n- Keep the reply concise and in ${sparkName}'s voice.\n\nWhen replying, you must produce either:\n\nFor explore (DO NOT propose a new title/idea):\nMode: explore\nReason: [brief, grounded persona explanation]\nReply: [the assistant's natural reply with up to 2 specific questions]\n\nFor update:\nMode: update\nReason: [brief, grounded persona explanation]\nTitle: [updated concise title, max 8 words]\nIdea: [updated idea text]\n`
  }

  let text = ''
  try {
    const res = await generateText({ model: openai('gpt-4o-mini'), system: undefined as any, messages: [...messages, controller], temperature: 0.8 })
    text = res.text || ''
  } catch (e: any) {
    throw createError({ statusCode: 500, message: e?.message || 'Failed to refine' })
  }

  // Parse controller format
  const modeMatch = text.match(/Mode:\s*(update|explore)/i)
  const mode = (modeMatch ? modeMatch[1].toLowerCase() : 'explore') as 'update' | 'explore'
  const reasonMatch = text.match(/Reason:\s*([\s\S]*?)(?:\n(?:Title:|Reply:)|$)/i)
  const replyMatch = text.match(/Reply:\s*([\s\S]*?)(?:$)/i)
  const titleMatch = text.match(/Title:\s*(.+?)(?:\n|$)/i)
  const ideaMatch = text.match(/Idea:\s*([\s\S]+?)(?:$)/i)

  const assistantReply = (replyMatch ? replyMatch[1].trim() : '').trim()
  const explanation = (reasonMatch ? reasonMatch[1].trim() : '').substring(0, 2000)

  // Persist dialogue
  try {
    const db = prisma as any
    const toCreate: any[] = []
    for (const m of clientMessages.slice(-1)) {
      toCreate.push({ outputId: output.id, userId: user.id, role: 'user', text: m.text })
    }
    if (assistantReply) toCreate.push({ outputId: output.id, userId: user.id, role: 'assistant', text: assistantReply })
    if (explanation && !assistantReply) toCreate.push({ outputId: output.id, userId: user.id, role: 'assistant', text: explanation })
    if (toCreate.length > 0) await db.outputComment.createMany({ data: toCreate })
  } catch {}

  // Handle update mode
  if (mode === 'update') {
    const newTitle = (titleMatch ? (titleMatch[1] || '').trim() : '') || (output.title || 'Untitled Idea')
    const newText = (ideaMatch ? (ideaMatch[1] || '').trim() : '') || output.text
    try {
      const updated = await prisma.output.update({ where: { id: output.id }, data: { title: newTitle, text: newText } })
      return { data: { mode, message: assistantReply || explanation || '', title: updated.title || '', text: updated.text } }
    } catch (e: any) {
      // If update fails, still return the reply
      return { data: { mode: 'explore', message: assistantReply || explanation || '' } }
    }
  }

  // Explore mode: return reply only
  return { data: { mode, message: assistantReply || explanation || '' } }
})


