import { defineEventHandler, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Basic auth: require a logged-in user
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Fetch both user patterns and spark patterns
    const [userPatterns, sparkPatterns] = await Promise.all([
      prisma.pattern.findMany({
        where: {
          userId: { not: null },
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
          sparkId: { not: null },
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
    console.error('Error fetching all patterns:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: { error: error.message }
    })
  }
})


