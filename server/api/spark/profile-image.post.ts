import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: 'No form data provided' })
  }

  const sparkIdPart = form.find(p => p.name === 'sparkId')
  const filePart = form.find(p => p.name === 'file' && p.filename)

  const sparkId = sparkIdPart?.data?.toString()
  if (!sparkId) {
    throw createError({ statusCode: 400, statusMessage: 'sparkId is required' })
  }
  if (!filePart || !filePart.filename || !filePart.data) {
    throw createError({ statusCode: 400, statusMessage: 'No image file provided' })
  }

  // Validate ownership
  const spark = await prisma.spark.findFirst({ where: { id: sparkId, userId: user.id }, select: { id: true } })
  if (!spark) {
    throw createError({ statusCode: 404, statusMessage: 'Spark not found' })
  }

  // Basic file validation
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
  const contentType = filePart.type || 'application/octet-stream'
  if (!allowedTypes.includes(contentType)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported image type' })
  }
  const maxSize = 5 * 1024 * 1024
  if (filePart.data.length > maxSize) {
    throw createError({ statusCode: 400, statusMessage: 'Image too large (max 5MB)' })
  }

  const supabase = await serverSupabaseClient(event)
  const ext = (() => {
    if (contentType === 'image/png') return 'png'
    if (contentType === 'image/webp') return 'webp'
    if (contentType === 'image/svg+xml') return 'svg'
    return 'jpg'
  })()
  const filePath = `${user.id}/sparks/${sparkId}/profile.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('portfolio-assets')
    .upload(filePath, filePart.data, { contentType, upsert: true })
  if (uploadError) {
    throw createError({ statusCode: 500, statusMessage: `Failed to upload image: ${uploadError.message}` })
  }

  const { data: publicData } = supabase.storage
    .from('portfolio-assets')
    .getPublicUrl(filePath)

  const publicUrl = publicData.publicUrl

  await prisma.spark.update({ where: { id: sparkId }, data: { profileImageUrl: publicUrl } })

  return { success: true, url: publicUrl }
})


