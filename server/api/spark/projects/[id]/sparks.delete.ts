import { serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

const bodySchema = z.object({
  sparkId: z.string().uuid(),
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const projectId = event.context.params?.id
  if (!projectId) {
    throw createError({ statusCode: 400, message: 'Project ID is required' })
  }

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }
  const { sparkId } = parsed.data

  // Ensure ownership
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  try {
    await prisma.sparksOnProjects.delete({
      where: { projectId_sparkId: { projectId, sparkId } },
    })
    return { ok: true }
  } catch (error) {
    console.error('Error unassigning spark from project:', error)
    throw createError({ statusCode: 500, message: 'Error unassigning spark from project' })
  }
})


