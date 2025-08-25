import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { serverSupabaseUser } from '#supabase/server'
import { processProjectRun } from '~/server/utils/projectRuns'
import { resolveUserPlan } from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const projectId = getRouterParam(event, 'id')
  if (!projectId) throw createError({ statusCode: 400, statusMessage: 'Project id is required' })

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  // Enforce free-plan run limits per project (max 3 total runs)
  const { plan } = await resolveUserPlan(event)
  if (plan !== 'premium') {
    const runCount = await prisma.projectRun.count({ where: { projectId: project.id, userId: user.id } })
    if (runCount >= 3) {
      throw createError({ statusCode: 402, message: 'Run limit reached for free plan. Upgrade to continue running this project.' })
    }
  }

  // Use any-cast to avoid linter mismatches when Prisma Client types lag local schema
  const db = prisma as any
  const run = await db.projectRun.create({ data: { projectId: project.id, userId: user.id, status: 'running' } })

  // Fire-and-forget processing (non-blocking)
  processProjectRun(run.id).catch(async (e) => {
    console.error('Run processing failed', e)
    try {
      await db.projectRun.update({ where: { id: run.id }, data: { status: 'error', finishedAt: new Date(), summary: e?.message || 'Run failed' } })
    } catch {}
  })

  return { runId: run.id }
})


