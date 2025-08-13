import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const outputId = event.context.params?.id
  if (!outputId) {
    throw createError({ statusCode: 400, message: 'Output ID is required' })
  }

  try {
    const output = await prisma.output.findFirst({
      where: {
        id: outputId,
        project: {
          userId: user.id,
        },
      },
    })

    if (!output) {
      throw createError({ statusCode: 404, message: 'Output not found' })
    }

    await prisma.output.delete({ where: { id: outputId } })

    return { status: 'ok' }
  } catch (error) {
    console.error(`Error deleting output ${outputId}:`, error)
    throw createError({ statusCode: 500, message: 'Error deleting output' })
  }
})


