import { defineEventHandler, createError, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { words } = await readBody(event)

  if (!words || !Array.isArray(words) || words.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: A non-empty array of words is required',
    })
  }

  // Optionally, you can add more validation, e.g., check for 10 words.
  if (words.length !== 10) {
      console.warn(`DAT submission for user ${user.id} has ${words.length} words, expected 10.`);
  }

  try {
    const newSubmission = await prisma.dATSubmission.create({
      data: {
        userId: user.id,
        words: words,
        // Score is not calculated here. This would require a separate process.
        score: null,
      },
    })
    return newSubmission
  } catch (error) {
    console.error('Error submitting DAT words:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
}) 