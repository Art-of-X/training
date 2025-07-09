import { defineEventHandler, createError, getRouterParam } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
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
      }
    })

    if (!recording) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No recording found for this question'
      })
    }
    
    const supabase = await serverSupabaseClient(event)
    let audioUrl = null
    if (recording.audioPath) {
      const { data } = supabase.storage.from('monologue-recordings').getPublicUrl(recording.audioPath)
      audioUrl = data.publicUrl
    }

    let supplementaryFileUrl = null
    if (recording.supplementaryFilePath) {
      const { data } = supabase.storage.from('monologue-recordings').getPublicUrl(recording.supplementaryFilePath)
      supplementaryFileUrl = data.publicUrl
    }

    return {
      success: true,
      data: {
        id: recording.id,
        questionId: recording.questionId,
        questionText: recording.questionText,
        audioPath: audioUrl,
        durationSeconds: recording.durationSeconds,
        supplementaryFilePath: supplementaryFileUrl,
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