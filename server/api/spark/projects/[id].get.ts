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
            spark: {
              select: {
                id: true,
                name: true,
                description: true,
                discipline: true,
                dendrograms: {
                  select: {
                    id: true,
                    dendrogramSvg: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },
        outputs: {
          include: {
            spark: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      }
    })

    if (!project) {
      throw createError({ statusCode: 404, message: 'Project not found' })
    }

    const totalRuns = await prisma.projectRun.count({ where: { projectId, userId: user.id } })

    return {
      data: project,
      meta: { totalRuns }
    }
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error)
    throw createError({ statusCode: 500, message: 'Error fetching project' })
  }
})
