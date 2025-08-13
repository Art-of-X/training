import { defineEventHandler, createError, readBody } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { type CoreMessage, generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const { sparkId, messages }: { sparkId: string; messages: CoreMessage[] } = await readBody(event)
    if (!sparkId) {
      throw createError({ statusCode: 400, statusMessage: 'sparkId is required' })
    }

    const spark = await prisma.spark.findUnique({ where: { id: sparkId } })
    if (!spark) {
      throw createError({ statusCode: 404, statusMessage: 'Spark not found' })
    }

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // If no messages, return a greeting seeded by the spark prompt
    if (!messages || messages.length === 0) {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: spark.systemPrompt,
        prompt: `Greet the user succinctly as the spark "${spark.name}" and ask how you can help within this domain: ${spark.discipline}. Keep it to one or two sentences.`,
        temperature: 0.7,
      })
      return { content: text }
    }

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: spark.systemPrompt,
      messages,
      temperature: 0.8,
      // IMPORTANT: no tools for spark chat
    })

    return { content: text }
  } catch (e: any) {
    console.error('Spark chat error:', e)
    throw createError({ statusCode: e.statusCode || 500, statusMessage: e.statusMessage || e.message || 'Internal Server Error' })
  }
})


