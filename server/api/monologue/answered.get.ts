import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const recordings = await prisma.monologueRecording.findMany({
      where: { userId: user.id },
      select: { questionId: true }
    })
    
    const answeredQuestionIds = recordings.map(r => r.questionId)
    return answeredQuestionIds
  } catch (error: any) {
    console.error('Error fetching answered question IDs:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch answered questions'
    })
  }
}) 