import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return {
      data: projects
    }
  } catch (error) {
    console.error('Error fetching projects:', error)
    throw createError({ statusCode: 500, message: 'Error fetching projects' })
  }
})
