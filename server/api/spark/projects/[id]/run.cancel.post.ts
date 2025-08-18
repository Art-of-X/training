import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const projectId = getRouterParam(event, 'id')
  if (!projectId) throw createError({ statusCode: 400, statusMessage: 'Project id is required' })

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  try {
    // Find and cancel the active run
    const activeRun = await prisma.projectRun.findFirst({
      where: { 
        projectId, 
        userId: user.id, 
        status: 'running' 
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!activeRun) {
      throw createError({ statusCode: 404, statusMessage: 'No active run found' })
    }

    // Update the run status to cancelled
    await prisma.projectRun.update({
      where: { id: activeRun.id },
      data: { 
        status: 'cancelled',
        finishedAt: new Date(),
        summary: 'Run cancelled by user'
      }
    })

    return { success: true, message: 'Run cancelled successfully' }
  } catch (error: any) {
    console.error('Error cancelling run:', error)
    throw createError({ 
      statusCode: error.statusCode || 500, 
      statusMessage: error.statusMessage || 'Failed to cancel run' 
    })
  }
})
