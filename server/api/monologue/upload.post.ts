import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { prisma } from '../../utils/prisma'
import { z } from 'zod'

// Validation schema for additional data
const monologueDataSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  duration: z.number().min(0).optional(),
  questionId: z.number().int().min(1)
})

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

    // Read multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No audio file provided'
      })
    }

    const supabaseServiceRole = serverSupabaseServiceRole(event)
    const supabaseUser = await serverSupabaseClient(event)
    let audioFile = null
    let additionalData = null

    // Process form data
    for (const item of formData) {
      if (item.name === 'audio' && item.data) {
        audioFile = item
      } else if (item.name === 'data' && item.data) {
        try {
          additionalData = JSON.parse(item.data.toString())
        } catch (e) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Invalid additional data format'
          })
        }
      }
    }

    if (!audioFile) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Audio file is required'
      })
    }

    // Validate additional data
    const { question, duration, questionId } = monologueDataSchema.parse(additionalData || {})

    // Validate audio file type
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg']
    if (!audioFile.type || !allowedTypes.some(type => audioFile.type?.includes(type))) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid audio file type. Allowed types: WebM, MP4, WAV, OGG'
      })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (audioFile.data.length > maxSize) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Audio file too large. Maximum size is 50MB.'
      })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const fileExtension = audioFile.type?.includes('webm') ? 'webm' : 
                         audioFile.type?.includes('mp4') ? 'mp4' :
                         audioFile.type?.includes('wav') ? 'wav' : 'ogg'
    const fileName = `${timestamp}_monologue.${fileExtension}`
    const filePath = `${user.id}/${fileName}`

    console.log('Upload debug info:', {
      userId: user.id,
      filePath: filePath,
      bucketName: 'monologue-recordings'
    })

    // Upload to Supabase Storage (uses user context for RLS)
    const { data, error } = await supabaseUser.storage
      .from('monologue-recordings')
      .upload(filePath, audioFile.data, {
        contentType: audioFile.type,
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to upload audio: ${error.message}`
      })
    }

    // Get public URL (can use service role for this)
    const { data: publicData } = supabaseServiceRole.storage
      .from('monologue-recordings')
      .getPublicUrl(filePath)

    // Save to database using Prisma (bypasses RLS but we control access via user.id)
    try {
      const monologueRecording = await prisma.monologueRecording.create({
        data: {
          userId: user.id,
          questionText: question,
          audioPath: publicData.publicUrl,
          durationSeconds: duration ? Math.round(duration) : null,
          questionId: questionId
        }
      })

      return {
        success: true,
        data: monologueRecording
      }
    } catch (dbError: any) {
      console.error('Database insert error:', dbError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to save recording: ${dbError.message}`
      })
    }
  } catch (error: any) {
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid input data',
        data: error.errors
      })
    }

    // Re-throw createError instances
    if (error.statusCode) {
      throw error
    }

    // Handle unexpected errors
    console.error('Error uploading monologue recording:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
}) 