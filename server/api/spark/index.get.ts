import { defineEventHandler, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const sparks = await prisma.spark.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        discipline: true,
        userId: true,
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
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
    return { data: sparks }
  }
  catch (error) {
    console.error('Error fetching sparks:', error)
    // Here you could check for specific error types if needed
    // For example, if (error instanceof Prisma.PrismaClientKnownRequestError) { ... }

    // Throw a generic error to be handled by the client
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch sparks',
    })
  }
})
