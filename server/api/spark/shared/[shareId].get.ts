import { defineEventHandler, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const shareId = event.context.params?.shareId
  if (!shareId) {
    throw createError({ statusCode: 400, statusMessage: 'Share ID is required' })
  }

  try {
    const spark = await prisma.spark.findFirst({
      where: {
        publicShareId: shareId,
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        discipline: true,
        systemPrompt: true,
        createdAt: true,
        updatedAt: true,
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

    if (!spark) {
      throw createError({ statusCode: 404, statusMessage: 'Spark not found or not publicly shared' })
    }

    return { data: spark }
  } catch (error: any) {
    if (error.statusCode) throw error
    
    console.error('Error fetching shared spark:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch shared spark' })
  }
})
