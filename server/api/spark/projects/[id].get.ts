import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const projectId = event.context.params?.id
  if (!projectId) {
    throw createError({ statusCode: 400, message: 'Project ID is required' })
  }

  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id
      },
      include: {
        contextItems: true,
        sparks: {
          include: {
            spark: true
          }
        },
        outputs: {
          include: {
            spark: true
          }
        }
      }
    })

    if (!project) {
      throw createError({ statusCode: 404, message: 'Project not found' })
    }

    return {
      data: project
    }
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error)
    throw createError({ statusCode: 500, message: 'Error fetching project' })
  }
})
