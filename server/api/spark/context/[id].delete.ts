import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const contextItemId = event.context.params?.id
  if (!contextItemId) {
    throw createError({ statusCode: 400, message: 'Context Item ID is required' })
  }

  try {
    const contextItem = await prisma.contextItem.findFirst({
      where: {
        id: contextItemId,
        project: {
          userId: user.id
        }
      }
    })

    if (!contextItem) {
      throw createError({ statusCode: 404, message: 'Context item not found' })
    }

    await prisma.contextItem.delete({
      where: {
        id: contextItemId
      }
    })

    return {
      status: 'ok'
    }
  } catch (error) {
    console.error(`Error deleting context item ${contextItemId}:`, error)
    throw createError({ statusCode: 500, message: 'Error deleting context item' })
  }
})
