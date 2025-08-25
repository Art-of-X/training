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

  const output = await prisma.output.findFirst({
    where: { id: outputId, project: { userId: user.id } },
    include: { spark: true }
  })
  if (!output) {
    throw createError({ statusCode: 404, message: 'Output not found' })
  }

  let comments: any[] = []
  try {
    // If the migration hasn't been applied yet, this may throw; fallback to empty
    // @ts-ignore
    comments = await (prisma as any).outputComment.findMany({
      where: { outputId },
      orderBy: { createdAt: 'asc' }
    })
  } catch {}

  return { data: { output, comments } }
})


