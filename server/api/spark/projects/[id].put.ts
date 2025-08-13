import { serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'

const schema = z.object({
  task: z.string(),
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

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.errors[0].message })
  }

  // Ensure ownership
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })
  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }

  try {
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { task: parsed.data.task },
    })
    return { data: updated }
  } catch (error) {
    console.error('Error updating project task:', error)
    throw createError({ statusCode: 500, message: 'Error updating project' })
  }
})


