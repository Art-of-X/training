import { defineEventHandler, createError, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { questionId, answer } = await readBody(event)

  if (!questionId || !answer || typeof answer !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: questionId and a non-empty answer string are required',
    })
  }

  try {
    const newAnswer = await prisma.rATAnswer.create({
      data: {
        userId: user.id,
        questionId: questionId,
        answer: answer,
      },
    })
    return newAnswer
  } catch (error) {
    console.error('Error submitting RAT answer:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
}) 