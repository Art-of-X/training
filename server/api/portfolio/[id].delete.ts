import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const itemId = event.context.params?.id
    if (!itemId) {
      throw createError({ statusCode: 400, statusMessage: 'Item ID is required' })
    }

    const itemToDelete = await prisma.portfolioItem.findUnique({
      where: { id: itemId },
    })

    if (!itemToDelete) {
      throw createError({ statusCode: 404, statusMessage: 'Item not found' })
    }

    if (itemToDelete.userId !== user.id) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    // If there's a file path, delete the file from storage
    if (itemToDelete.filePath) {
      const supabase = await serverSupabaseClient(event)
      
      // Handle both full URLs and relative paths for robustness
      let pathToDelete = itemToDelete.filePath
      const BUCKET_NAME = 'uploads'
      const bucketUrlPart = `/storage/v1/object/public/${BUCKET_NAME}/`

      if (pathToDelete.includes(bucketUrlPart)) {
        pathToDelete = pathToDelete.split(bucketUrlPart)[1]
      }
      
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([pathToDelete])
      
      if (deleteError) {
        // Log the error but proceed to delete from DB anyway
        console.error('Failed to delete file from storage:', deleteError.message)
      }
    }

    await prisma.portfolioItem.delete({
      where: { id: itemId },
    })

    return {
      success: true,
      message: 'Portfolio item deleted successfully.',
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Error deleting portfolio item:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
}) 