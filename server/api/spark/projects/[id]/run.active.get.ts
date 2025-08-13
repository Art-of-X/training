import { defineEventHandler, createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const projectId = getRouterParam(event, 'id')
  if (!projectId) throw createError({ statusCode: 400, statusMessage: 'Project id is required' })

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  const active = await prisma.projectRun.findFirst({
    where: { projectId, userId: user.id, status: 'running' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, createdAt: true },
  })

  return { runId: active?.id || null, status: active?.status || null }
})


