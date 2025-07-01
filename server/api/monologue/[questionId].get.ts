import { defineEventHandler, createError, getRouterParam } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    // Ensure user is authenticated
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const questionId = getRouterParam(event, 'questionId')
    if (!questionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Question ID is required'
      })
    }

    const questionIdNum = parseInt(questionId)
    if (isNaN(questionIdNum)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid question ID'
      })
    }

    // Fetch the existing recording for this user and question
    const recording = await prisma.monologueRecording.findFirst({
      where: {
        userId: user.id,
        questionId: questionIdNum
      },
      include: {
        question: true
      }
    })

    if (!recording) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No recording found for this question'
      })
    }

    return {
      success: true,
      data: {
        id: recording.id,
        questionId: recording.questionId,
        questionText: recording.questionText,
        audioPath: recording.audioPath,
        durationSeconds: recording.durationSeconds,
        supplementaryFilePath: recording.supplementaryFilePath,
        supplementaryLink: recording.supplementaryLink,
        supplementaryDescription: recording.supplementaryDescription,
        createdAt: recording.createdAt
      }
    }
  } catch (error: any) {
    // Re-throw createError instances
    if (error.statusCode) {
      throw error
    }

    // Handle unexpected errors
    console.error('Error fetching monologue recording:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
}) 