import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const name = (body?.name || '').toString().trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  }

  try {
    const profile = await prisma.userProfile.upsert({
      where: { id: user.id },
      update: { name },
      create: { id: user.id, name },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    })
    return { data: profile }
  } catch (error: any) {
    console.error('Failed to update profile name:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})


