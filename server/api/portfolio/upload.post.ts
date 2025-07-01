import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    }

    const formData = await readMultipartFormData(event)
    if (!formData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No form data provided',
      })
    }

    const descriptionEntry = formData.find((part) => part.name === 'description')
    const description = descriptionEntry ? descriptionEntry.data.toString() : ''

    if (!description) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Description is required',
      })
    }

    const file = formData.find((part) => part.name === 'file' && part.filename)

    if (!file || !file.filename || !file.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file provided',
      })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.data.length > maxSize) {
      throw createError({
        statusCode: 400,
        statusMessage: `File too large: ${file.filename}. Maximum size is 10MB.`,
      })
    }

    const supabase = await serverSupabaseClient(event)

    const fileName = `${Date.now()}_${file.filename.replace(
      /[^a-zA-Z0-9.-]/g,
      '_'
    )}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('portfolio-assets')
      .upload(filePath, file.data, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to upload ${file.filename}: ${uploadError.message}`,
      })
    }

    const newItem = await prisma.portfolioItem.create({
      data: {
        userId: user.id,
        description,
        filePath: filePath,
      },
    })

    return {
      success: true,
      data: newItem,
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    console.error('Error uploading portfolio file:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
}) 