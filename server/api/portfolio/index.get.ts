import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const portfolioItems = await prisma.portfolioItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    })

    return {
      success: true,
      data: portfolioItems || [],
    }
  } catch (error: any) {
    console.error('Error fetching portfolio items:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
}) 