import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  task: z.string().min(1, 'Task is required'),
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { success, data, error } = createProjectSchema.safeParse(body)

  if (!success) {
    throw createError({ statusCode: 400, message: error.errors[0].message })
  }

  try {
    const newProject = await prisma.project.create({
      data: {
        userId: user.id,
        name: data.name,
        task: data.task,
      }
    })

    return {
      data: newProject
    }
  } catch (error) {
    console.error('Error creating project:', error)
    throw createError({ statusCode: 500, message: 'Error creating project' })
  }
})
