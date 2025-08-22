import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'
import { z } from 'zod'
import { resolveUserPlan, PLAN_LIMITS } from '~/server/utils/stripe'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  task: z.string().min(1, 'Task is required'),
  sparkIds: z.array(z.string().uuid()).optional(),
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
    // Enforce plan limits on number of projects per user
    const { plan } = await resolveUserPlan(event)
    const limits = PLAN_LIMITS[plan]
    const projectCount = await prisma.project.count({ where: { userId: user.id } })
    if (projectCount >= limits.projects) {
      throw createError({ statusCode: 402, message: `Project limit reached for ${plan} plan. Please upgrade to create more projects.` })
    }

    // Idempotency: if a project with the same name already exists for this user, return it
    const existing = await prisma.project.findFirst({
      where: {
        userId: user.id,
        name: data.name,
      },
      orderBy: { createdAt: 'desc' },
    })

    let project = existing
    if (!project) {
      project = await prisma.project.create({
        data: {
          userId: user.id,
          name: data.name,
          task: data.task,
        }
      })
    }

    // Optionally assign initial sparks (ignore duplicates)
    if (data.sparkIds && data.sparkIds.length > 0) {
      const uniqueIds = Array.from(new Set(data.sparkIds))
      const sparkRecords = await prisma.spark.findMany({ where: { id: { in: uniqueIds } }, select: { id: true } })
      const validIds = new Set(sparkRecords.map(s => s.id))
      // Upsert links
      await Promise.all(
        uniqueIds
          .filter(id => validIds.has(id))
          .map(sparkId => prisma.sparksOnProjects.upsert({
            where: { projectId_sparkId: { projectId: project!.id, sparkId } },
            create: { projectId: project!.id, sparkId },
            update: {},
          }))
      )
    }

    return { data: project }
  } catch (error) {
    console.error('Error creating project:', error)
    throw createError({ statusCode: 500, message: 'Error creating project' })
  }
})
