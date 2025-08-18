import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody<{
    name?: string
    description?: string
    systemPrompt?: string
    discipline?: string
    userId?: string
  }>(event)

  const name = (body?.name || 'My Spark').toString().trim()
  const description = (body?.description || 'Personal creative spark').toString().trim()
  const systemPrompt = (body?.systemPrompt || 'You are a creative assistant.').toString().trim()
  const discipline = (body?.discipline || 'General').toString().trim()
  const userId = body?.userId || user.id

  // Verify user can create for this userId (either their own or if they have permission)
  if (userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  try {
    const spark = await prisma.spark.create({
      data: {
        name,
        description,
        systemPrompt,
        discipline,
        userId,
        isPublic: false,
        profitSplitOptIn: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        discipline: true,
        userId: true,
        isPublic: true,
        profitSplitOptIn: true,
        publicShareId: true,
        createdAt: true,
        updatedAt: true,
      }
    })
    return { data: spark }
  } catch (error: any) {
    console.error('Failed to create spark:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
