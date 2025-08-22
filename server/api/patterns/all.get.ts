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
    // Use raw SQL to handle the null sparkId issue properly
    const [userPatterns, sparkPatterns] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT p.id, p.user_id as "userId", p.spark_id as "sparkId", 
               p.method, p.competency, p.spark, p.created_at as "createdAt",
               p.is_predefined as "isPredefined", p.is_predefined_method as "isPredefinedMethod",
               p.is_predefined_competency as "isPredefinedCompetency",
               u.name as "userName"
        FROM patterns p
        LEFT JOIN user_profiles u ON u.id = p.user_id
        WHERE p.user_id IS NOT NULL 
          AND p.spark_id IS NOT NULL
          AND p.spark <> ''
        ORDER BY p.created_at ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT p.id, p.user_id as "userId", p.spark_id as "sparkId",
               p.method, p.competency, p.spark, p.created_at as "createdAt", 
               p.is_predefined as "isPredefined", p.is_predefined_method as "isPredefinedMethod",
               p.is_predefined_competency as "isPredefinedCompetency",
               s.name as "sparkName", s.description as "sparkDescription"
        FROM patterns p
        LEFT JOIN sparks s ON s.id = p.spark_id
        WHERE p.user_id IS NULL 
          AND p.spark_id IS NOT NULL
          AND p.spark <> ''
        ORDER BY p.created_at ASC
      `
    ]);

    // Combine and format the patterns
    const allPatterns = [
      ...userPatterns.map(p => ({
        ...p,
        source: 'user' as const,
        sourceName: p.userName || 'Unknown User'
      })),
      ...sparkPatterns.map(p => ({
        ...p,
        source: 'spark' as const,
        sourceName: p.sparkName || 'Unnamed Spark'
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


