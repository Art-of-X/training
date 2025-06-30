import { defineEventHandler, createError, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { questionId, uses } = await readBody(event)

  if (!questionId || !uses || !Array.isArray(uses) || uses.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: questionId and a non-empty array of uses are required',
    })
  }

  try {
    const newAnswer = await prisma.aUTAnswer.create({
      data: {
        userId: user.id,
        questionId: questionId,
        uses: uses,
      },
    })
    return newAnswer
  } catch (error) {
    console.error('Error submitting AUT answer:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
}) 