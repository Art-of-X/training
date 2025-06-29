import { defineEventHandler, createError, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const { link, description } = await readBody(event)

    if (!link || !description) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Link and description are required',
      })
    }

    const newLink = await prisma.portfolioItem.create({
      data: {
        userId: user.id,
        link,
        description,
      },
    })

    return {
      success: true,
      data: newLink,
    }
  } catch (error: any) {
    console.error('Error creating link:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
}) 