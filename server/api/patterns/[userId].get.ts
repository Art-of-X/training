import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'userId')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID is required' })
  }

  const user = await serverSupabaseUser(event)
  if (!user || user.id !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  try {
    console.log('Prisma client in patterns API:', prisma);
    const patterns = await prisma.pattern.findMany({
      where: { 
        userId: userId,
        // Only include patterns with complete data
        method: { not: '' },
        competency: { not: '' },
        spark: { not: '' }
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
    })
    
    // Format patterns to include source information for consistency
    const formattedPatterns = patterns.map(p => ({
      ...p,
      source: 'user' as const,
      sourceName: p.user?.name || 'Unknown User'
    }));
    
    return { data: formattedPatterns }
  } catch (error: any) {
    console.error(`Error fetching patterns for user ${userId}:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
}) 