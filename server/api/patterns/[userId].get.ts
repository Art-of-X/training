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
    
    // Fetch both user patterns and patterns from user's sparks
    const [userPatterns, sparkPatterns] = await Promise.all([
      prisma.pattern.findMany({
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
      }),
      prisma.pattern.findMany({
        where: { 
          userId: null, // Predefined patterns
          sparkId: {
            in: await prisma.spark.findMany({
              where: { userId: userId },
              select: { id: true }
            }).then(sparks => sparks.map(s => s.id))
          },
          // Only include patterns with complete data
          method: { not: '' },
          competency: { not: '' },
          spark: { not: '' }
        },
        include: {
          sparkRef: {
            select: {
              name: true,
              description: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
      })
    ]);
    
    // Combine and format the patterns
    const allPatterns = [
      ...userPatterns.map(p => ({
        ...p,
        source: 'user' as const,
        sourceName: p.user?.name || 'Unknown User'
      })),
      ...sparkPatterns.map(p => ({
        ...p,
        source: 'spark' as const,
        sourceName: p.sparkRef?.name || 'Unnamed Spark'
      }))
    ];
    
    console.log(`Returning ${allPatterns.length} patterns (${userPatterns.length} user, ${sparkPatterns.length} spark)`);
    
    return { data: allPatterns }
  } catch (error: any) {
    console.error(`Error fetching patterns for user ${userId}:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
}) 