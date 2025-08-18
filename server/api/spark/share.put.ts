import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{ sparkId?: string; isPublic?: boolean; profitSplitOptIn?: boolean }>(event)
  const sparkId = (body?.sparkId || '').toString().trim()
  if (!sparkId) {
    throw createError({ statusCode: 400, statusMessage: 'sparkId is required' })
  }

  const isPublic = Boolean(body?.isPublic)
  const profitSplitOptIn = Boolean(body?.profitSplitOptIn)

  const spark = await prisma.spark.findUnique({ where: { id: sparkId }, select: { id: true, userId: true, publicShareId: true } })
  if (!spark) {
    throw createError({ statusCode: 404, statusMessage: 'Spark not found' })
  }
  if (spark.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Generate a share id if enabling public access and none exists yet
  let publicShareId: string | undefined = spark.publicShareId || undefined
  if (isPublic && !publicShareId) {
    // Use crypto.randomUUID; acceptable minimal solution for a share token
    publicShareId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }

  const updated = await prisma.spark.update({
    where: { id: sparkId },
    data: {
      isPublic,           // Controls public link generation
      profitSplitOptIn,   // Controls visibility in Personas page
      publicShareId,
    },
    select: {
      id: true,
      isPublic: true,
      profitSplitOptIn: true,
      publicShareId: true,
      name: true,
      description: true,
      discipline: true,
    }
  })

  return { data: updated }
})


