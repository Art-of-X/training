import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const portfolioItems = await prisma.portfolioItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    })

    const supabase = await serverSupabaseClient(event)
    const itemsWithUrls = portfolioItems.map(item => {
      if (item.filePath) {
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(item.filePath)
        return { ...item, filePath: publicUrl }
      }
      return item
    })

    return {
      success: true,
      data: itemsWithUrls || [],
    }
  } catch (error: any) {
    console.error('Error fetching portfolio items:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
}) 