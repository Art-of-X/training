import { serverSupabaseUser } from '#supabase/server'
import { createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { z } from 'zod'

const schema = z.object({ sparkId: z.string().uuid() })

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }
  const { sparkId } = parsed.data
  try {
    // Add sparkId to user's favoriteSparkIds array if not already present
    const userProfile = await prisma.userProfile.findUnique({
      where: { id: user.id },
      select: { favoriteSparkIds: true }
    })
    
    const currentFavorites = userProfile?.favoriteSparkIds || []
    if (!currentFavorites.includes(sparkId)) {
      await prisma.userProfile.update({
        where: { id: user.id },
        data: { 
          favoriteSparkIds: { push: sparkId }
        }
      })
    }
    
    return { data: { userId: user.id, sparkId, added: true } }
  } catch (error) {
    console.error('Error saving favorite:', error)
    throw createError({ statusCode: 500, message: 'Error saving favorite' })
  }
})


