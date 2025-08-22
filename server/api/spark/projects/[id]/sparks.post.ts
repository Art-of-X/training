import { serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { resolveUserPlan, PLAN_LIMITS } from '~/server/utils/stripe'

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

  // Ensure ownership and existence
  const [project, spark] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, userId: user.id } }),
    prisma.spark.findUnique({ where: { id: sparkId } }),
  ])

  if (!project) {
    throw createError({ statusCode: 404, message: 'Project not found' })
  }
  if (!spark) {
    throw createError({ statusCode: 404, message: 'Spark not found' })
  }

  try {
    // Enforce per-project spark assignment limit based on plan
    const { plan } = await resolveUserPlan(event)
    const limits = PLAN_LIMITS[plan]
    const currentCount = await prisma.sparksOnProjects.count({ where: { projectId } })
    if (currentCount >= limits.sparks) {
      throw createError({ statusCode: 402, message: `Spark limit reached for ${plan} plan. Please upgrade to add more sparks.` })
    }

    const link = await prisma.sparksOnProjects.create({
      data: { projectId, sparkId },
    })
    return { data: link }
  } catch (error: any) {
    // If already linked, ignore by returning existing-like response
    if (error?.code === 'P2002') {
      return { data: { projectId, sparkId } }
    }
    console.error('Error assigning spark to project:', error)
    throw createError({ statusCode: 500, message: 'Error assigning spark to project' })
  }
})


