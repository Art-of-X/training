import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { prisma } from '../../utils/prisma'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'path'

// Validation schema for additional data
const monologueDataSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  duration: z.number().min(0).optional(),
  questionId: z.number().int().min(1),
  supplementaryDescription: z.string().optional(),
  supplementaryLink: z.string().url().optional().or(z.literal(''))
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
    let supplementaryFile = null
    let additionalData = null

    // Process form data
    for (const item of formData) {
      if (item.name === 'audio' && item.data) {
        audioFile = item
      } else if (item.name === 'supplementaryFile' && item.data) {
        supplementaryFile = item
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
    const { question, duration, questionId, supplementaryDescription, supplementaryLink } = monologueDataSchema.parse(additionalData || {})

    // Validate that the questionId exists in the JSON file
    const questionsPath = path.join(process.cwd(), 'public', 'data', 'monologue-questions.json')
    const questionsContent = await fs.readFile(questionsPath, 'utf-8')
    const { questions } = JSON.parse(questionsContent)
    
    const existingQuestion = questions.find((q: any) => q.id === questionId)
    if (!existingQuestion) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid question ID: ${questionId}. Question does not exist.`
      })
    }

    // Validate supplementary content (file or link)
    if (supplementaryFile && supplementaryLink) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot provide both a file and a link. Please choose one.'
      })
    }

    // Validate supplementary file if present
    if (supplementaryFile) {
      if (!supplementaryDescription || supplementaryDescription.trim().length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Description is required when uploading a supplementary file'
        })
      }

      // Validate file size (max 10MB for supplementary files)
      const maxSupplementarySize = 10 * 1024 * 1024 // 10MB
      if (supplementaryFile.data.length > maxSupplementarySize) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Supplementary file too large. Maximum size is 10MB.'
        })
      }
    }

    // Validate supplementary link if present
    if (supplementaryLink && supplementaryLink.trim().length > 0) {
      if (!supplementaryDescription || supplementaryDescription.trim().length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Description is required when providing a supplementary link'
        })
      }
    }

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

    // Generate unique file paths
    const timestamp = Date.now()
    const audioFileExtension = audioFile.type?.includes('webm') ? 'webm' : 
                              audioFile.type?.includes('mp4') ? 'mp4' :
                              audioFile.type?.includes('wav') ? 'wav' : 'ogg'
    const audioFileName = `${timestamp}_monologue.${audioFileExtension}`
    const audioFilePath = `${user.id}/${audioFileName}`

    console.log('Upload debug info:', {
      userId: user.id,
      audioFilePath: audioFilePath,
      bucketName: 'monologue-recordings',
      hasSupplementaryFile: !!supplementaryFile
    })

    // Upload audio file to Supabase Storage
    const { error } = await supabaseUser.storage
      .from('monologue-recordings')
      .upload(audioFilePath, audioFile.data, {
        contentType: audioFile.type,
        upsert: false
      })

    if (error) {
      console.error('Supabase audio upload error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to upload audio: ${error.message}`
      })
    }

    // Handle supplementary file upload if present
    let supplementaryStoragePath = null
    if (supplementaryFile) {
      // Get file extension from filename or mime type
      const originalFileName = supplementaryFile.filename || 'file'
      const fileExtension = originalFileName.split('.').pop() || 'bin'
      const supplementaryFileName = `${timestamp}_supplementary.${fileExtension}`
      const supplementaryFilePath = `${user.id}/${supplementaryFileName}`

      const { error: supplementaryError } = await supabaseUser.storage
        .from('monologue-recordings')
        .upload(supplementaryFilePath, supplementaryFile.data, {
          contentType: supplementaryFile.type || 'application/octet-stream',
          upsert: false
        })

      if (supplementaryError) {
        console.error('Supabase supplementary file upload error:', supplementaryError)
        throw createError({
          statusCode: 500,
          statusMessage: `Failed to upload supplementary file: ${supplementaryError.message}`
        })
      }
      
      supplementaryStoragePath = supplementaryFilePath
    }

    // Save to database using Prisma (bypasses RLS but we control access via user.id)
    try {
      const monologueRecording = await prisma.monologueRecording.create({
        data: {
          userId: user.id,
          questionText: question,
          audioPath: audioFilePath,
          durationSeconds: duration ? Math.round(duration) : null,
          questionId: questionId,
          supplementaryFilePath: supplementaryStoragePath,
          supplementaryLink: supplementaryLink?.trim() || null,
          supplementaryDescription: supplementaryDescription?.trim() || null
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