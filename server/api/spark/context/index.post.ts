import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'
import { z } from 'zod'

const addContextItemSchema = z.object({
  projectId: z.string().uuid(),
  description: z.string().optional(),
  link: z.string().url().optional(),
  filePath: z.string().optional(),
  text: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { success, data, error } = addContextItemSchema.safeParse(body)

  if (!success) {
    throw createError({ statusCode: 400, message: error.errors[0].message })
  }

  try {
    // Verify that the project belongs to the user
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        userId: user.id,
      }
    })

    if (!project) {
      throw createError({ statusCode: 404, message: 'Project not found' })
    }

    const newContextItem = await prisma.contextItem.create({
      data: {
        projectId: data.projectId,
        description: data.description,
        link: data.link,
        filePath: data.filePath,
        text: data.text,
      }
    })

    return {
      data: newContextItem
    }
  } catch (error) {
    console.error('Error adding context item:', error)
    throw createError({ statusCode: 500, message: 'Error adding context item' })
  }
})
