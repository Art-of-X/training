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

  // Ensure ownership
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  try {
    const result = await prisma.output.deleteMany({ where: { projectId } })
    return { ok: true, count: result.count }
  } catch (error) {
    console.error(`Error deleting all outputs for project ${projectId}:`, error)
    throw createError({ statusCode: 500, message: 'Error deleting all outputs' })
  }
})



