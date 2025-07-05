import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '../../../utils/prisma'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID is required' })
  }

  try {
    let userProfile = await prisma.userProfile.findUnique({
      where: { id: userId },
    })

    // If profile doesn't exist, try to create it
    if (!userProfile) {
      // We need to verify that the request is coming from the user themselves
      // or from a server process that has the master key.
      const user = await serverSupabaseUser(event)

      // Only allow a user to create their own profile.
      if (!user || user.id !== userId) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
      }
      
      // Use email as a default name
      const name = user.email?.split('@')[0] || 'New User'

      userProfile = await prisma.userProfile.create({
        data: {
          id: user.id,
          name: name,
        },
      })
    }

    return { data: userProfile }
  } catch (error: any) {
    // Re-throw createError instances
    if (error.statusCode) {
      throw error
    }

    // Handle unexpected errors
    console.error(`Error fetching or creating user profile for ${userId}:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
}) 