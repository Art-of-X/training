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

    // First, fetch the existing recording to get file paths
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
    const BUCKET_NAME = 'monologue-recordings'

    // Function to extract path from URL or use as is
    const getPath = (fullPath: string | null) => {
      if (!fullPath) return null
      const bucketUrlPart = `/storage/v1/object/public/${BUCKET_NAME}/`
      if (fullPath.includes(bucketUrlPart)) {
        return fullPath.split(bucketUrlPart)[1]
      }
      return fullPath
    }

    // Delete files from Supabase Storage
    const filesToDelete = []
    
    const audioPath = getPath(recording.audioPath)
    if (audioPath) {
      filesToDelete.push(audioPath)
    }

    const supplementaryPath = getPath(recording.supplementaryFilePath)
    if (supplementaryPath) {
      filesToDelete.push(supplementaryPath)
    }

    // Delete files from storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filesToDelete)

      if (storageError) {
        console.error('Error deleting files from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the database record
    await prisma.monologueRecording.delete({
      where: {
        id: recording.id
      }
    })

    return {
      success: true,
      message: 'Recording deleted successfully'
    }
  } catch (error: any) {
    // Re-throw createError instances
    if (error.statusCode) {
      throw error
    }

    // Handle unexpected errors
    console.error('Error deleting monologue recording:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
}) 