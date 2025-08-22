import { serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  try {
    const userProfile = await prisma.userProfile.findUnique({
      where: { id: user.id },
      select: { favoriteSparkIds: true }
    })
    
    if (!userProfile?.favoriteSparkIds || userProfile.favoriteSparkIds.length === 0) {
      return { data: [] }
    }
    
    // Fetch the actual spark data for the favorite IDs
    const favoriteSparks = await prisma.spark.findMany({
      where: { id: { in: userProfile.favoriteSparkIds } },
      select: {
        id: true,
        name: true,
        description: true,
        discipline: true,
        dendrograms: {
          select: {
            id: true,
            dendrogramSvg: true,
            dendrogramPng: true,
            updatedAt: true
          }
        }
      }
    })
    
    return { data: favoriteSparks }
  } catch (e) {
    console.error('Error fetching favorites:', e)
    return { data: [] }
  }
})


