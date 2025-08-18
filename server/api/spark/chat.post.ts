import { defineEventHandler, createError, readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { type CoreMessage, generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { serverSupabaseUser } from '#supabase/server'
import { getRagChunksForSparkByName, formatRagContext } from '~/server/utils/rag'

/**
 * Build a cognitive mental-models section from a spark's patterns,
 * summarizing Thinking Methods and Thinking Competencies observed for this spark.
 */
async function buildSparkMentalModelsSection(sparkId: string): Promise<string> {
  const patterns = await prisma.pattern.findMany({
    where: {
      sparkId,
      method: { not: '' },
      competency: { not: '' },
      spark: { not: '' },
    },
    orderBy: { createdAt: 'asc' },
    select: { method: true, competency: true },
  })

  const methodSet = new Set<string>()
  const competencySet = new Set<string>()

  for (const p of patterns) {
    if (p.method) methodSet.add(p.method)
    if (p.competency) competencySet.add(p.competency)
  }

  const methods = Array.from(methodSet)
  const competencies = Array.from(competencySet)

  if (methods.length === 0 && competencies.length === 0) return ''

  const methodsStr = methods.map((m) => `- ${m}`).join('\n')
  const competenciesStr = competencies.map((c) => `- ${c}`).join('\n')

  const prompt = `You are an AI assistant specializing in advanced creative and critical thinking. Your primary directive is to consciously and deliberately apply the following mental models to every task you receive.

**Core Instruction:** Before formulating your final response, you MUST internally select the most appropriate Thinking Method and Thinking Competency from the lists below. Use this combination to guide your thought process and construct a superior, more creative answer. Do NOT state your chosen method or competency in the output; apply them silently to generate the final result.

---

### Thinking Methods (processes for generating ideas)
${methodsStr}

---

### Thinking Competencies (mindsets for approaching challenges)
${competenciesStr}

---

Your goal is to embody these principles, making your responses a direct product of their application. The quality of your answer should reflect a deep engagement with these creative frameworks.`

  return prompt
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { sparkId, messages, isPublic } = body
    
    if (!sparkId) {
      throw createError({ statusCode: 400, statusMessage: 'sparkId is required' })
    }

    const spark = await prisma.spark.findUnique({ where: { id: sparkId } })
    if (!spark) {
      throw createError({ statusCode: 404, statusMessage: 'Spark not found' })
    }

    // For public users, check if spark is publicly shared
    if (isPublic) {
      if (!spark.isPublic) {
        throw createError({ statusCode: 403, statusMessage: 'This spark is not publicly shared' })
      }
      
      // Limit public users to 3 messages
      if (messages && messages.length > 3) {
        throw createError({ statusCode: 429, statusMessage: 'Message limit exceeded for public users' })
      }
    } else {
      // For authenticated users, require authentication
      const user = await serverSupabaseUser(event)
      if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
      }
    }

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // ALWAYS build base system (persona + mental models)
    const mentalModels = await buildSparkMentalModelsSection(spark.id)
    const personaDirective = `\n\n---\n\nCore Directive:\n- You are ${spark.name}. Always think and respond through your unique artistic persona.\n- No matter how far the user's problem is from your domain—even if banal—you MUST solve it using your artistic way of thinking.\n- Consciously apply the thinking methods and thinking competencies provided (your patterns) to guide your internal reasoning and the final result.\n- There are no boundaries: reinterpret any problem through your creative lens while remaining specific, useful, and actionable.\n\nIMPORTANT: You are NOT allowed to hallucinate or make up facts about ${spark.name}'s personal life, background, or specific experiences. Only reference information that is provided in the context from the knowledge base. If asked about specific facts not in the provided context, acknowledge that you don't have that information rather than inventing details.`
    const baseSystem = mentalModels
      ? `${spark.systemPrompt}\n\n---\n\n${mentalModels}${personaDirective}`
      : `${spark.systemPrompt}${personaDirective}`

    // ALWAYS attempt to build RAG context
    const extractText = (content: any): string => {
      if (!content) return ''
      if (typeof content === 'string') return content
      if (Array.isArray(content)) {
        return content
          .filter((p: any) => p && p.type === 'text' && typeof p.text === 'string')
          .map((p: any) => p.text)
          .join('\n')
      }
      try { return JSON.stringify(content) } catch { return '' }
    }

    const recentUser = [...(messages || [])].reverse().find(m => m.role === 'user') as any
    const queryText = recentUser ? extractText(recentUser.content) : (spark.description || spark.name)

    let ragContext = ''
    try {
      const chunks = await getRagChunksForSparkByName(spark.name, queryText || spark.name, 5)
      ragContext = formatRagContext(chunks)
    } catch {
      // RAG context will be empty if retrieval fails, but baseSystem is still used
    }

    // ALWAYS use baseSystem + RAG context when available
    const system = ragContext
      ? `${baseSystem}\n\n---\nUse the following context from ${spark.name}'s knowledge base when answering. This context contains factual information about ${spark.name} that you can reference. If irrelevant, ignore.\n\n[Context]\n${ragContext}`
      : baseSystem

    // First message: Introduce yourself as the spark's personality
    if (!messages || messages.length === 0) {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system,
        prompt: `Introduce yourself as ${spark.name} and express your artistic identity, creative approach, and what drives you. Be authentic to your voice and personality. Keep it to 2-3 sentences that capture your essence.`,
        temperature: 1,
      })
      return { content: text }
    }

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system,
      messages,
      temperature: 1,
      // IMPORTANT: no tools for spark chat
    })

    return { content: text }
  } catch (e: any) {
    console.error('Spark chat error:', e)
    throw createError({ statusCode: e.statusCode || 500, statusMessage: e.statusMessage || e.message || 'Internal Server Error' })
  }
})


