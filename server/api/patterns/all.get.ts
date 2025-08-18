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
          // Only require spark content to be present
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
          userId: null,
          // Only require spark content to be present
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
    
    // Debug: Log a few sample patterns to see their structure
    if (allPatterns.length > 0) {
      console.log('Sample patterns:', allPatterns.slice(0, 3).map(p => ({
        id: p.id,
        method: p.method,
        competency: p.competency,
        spark: p.spark?.substring(0, 50),
        sparkId: p.sparkId,
        userId: p.userId
      })));
    }
    
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


