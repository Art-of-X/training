import { defineEventHandler, readBody, createError } from 'h3'
import { prisma } from '../../utils/prisma'
import { z } from 'zod'

// Validation schema
const createProfileSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(3).max(50)
})

export default defineEventHandler(async (event) => {
  try {
    // Parse and validate request body
    const body = await readBody(event)
    const { userId, name } = createProfileSchema.parse(body)

    // Check if user profile already exists
    const existingProfile = await prisma.userProfile.findUnique({
      where: { id: userId }
    })

    if (existingProfile) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Profile already exists'
      })
    }

    // Check if name is already taken
    const existingUser = await prisma.userProfile.findUnique({
      where: { name }
    })

    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Name is already taken'
      })
    }

    // Create user profile
    const userProfile = await prisma.userProfile.create({
      data: {
        id: userId,
        name
      }
    })

    return {
      success: true,
      data: userProfile
    }
  } catch (error: any) {
    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid input data',
        data: error.errors
      })
    }

    // Re-throw createError instances
    if (error.statusCode) {
      throw error
    }

    // Handle unexpected errors
    console.error('Error creating user profile:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
}) 