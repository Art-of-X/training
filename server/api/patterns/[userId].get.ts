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
    
    // Fetch both user patterns (may have NULL spark_id) and patterns from user's sparks using raw SQL
    const [userPatterns, sparkPatterns] = await Promise.all([
      prisma.$queryRaw<any[]>`SELECT p.id,
          p.user_id AS "userId",
          p.spark_id AS "sparkId",
          p.method,
          p.competency,
          p.spark,
          p.created_at AS "createdAt",
          p.is_predefined AS "isPredefined",
          p.is_predefined_method AS "isPredefinedMethod",
          p.is_predefined_competency AS "isPredefinedCompetency",
          u.name AS "userName"
        FROM patterns p
        LEFT JOIN user_profiles u ON u.id = p.user_id
        WHERE p.user_id = ${userId}::uuid
          AND COALESCE(p.method, '') <> ''
          AND COALESCE(p.competency, '') <> ''
          AND COALESCE(p.spark, '') <> ''
        ORDER BY p.created_at ASC`,
      prisma.$queryRaw<any[]>`SELECT p.id,
          p.user_id AS "userId",
          p.spark_id AS "sparkId",
          p.method,
          p.competency,
          p.spark,
          p.created_at AS "createdAt",
          p.is_predefined AS "isPredefined",
          p.is_predefined_method AS "isPredefinedMethod",
          p.is_predefined_competency AS "isPredefinedCompetency",
          s.name AS "sparkName",
          s.description AS "sparkDescription"
        FROM patterns p
        JOIN sparks s ON s.id = p.spark_id
        WHERE p.user_id IS NULL
          AND p.spark_id IN (SELECT id FROM sparks WHERE user_id = ${userId}::uuid)
          AND COALESCE(p.method, '') <> ''
          AND COALESCE(p.competency, '') <> ''
          AND COALESCE(p.spark, '') <> ''
        ORDER BY p.created_at ASC`
    ]);
    
    // Combine and format the patterns
    const allPatterns = [
      ...userPatterns.map((p: any) => ({
        ...p,
        source: 'user' as const,
        sourceName: p.userName || 'Unknown User'
      })),
      ...sparkPatterns.map((p: any) => ({
        ...p,
        source: 'spark' as const,
        sourceName: p.sparkName || 'Unnamed Spark'
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