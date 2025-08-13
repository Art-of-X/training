import { defineEventHandler, createError, getRouterParam, setHeader } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const projectId = getRouterParam(event, 'id')
  const runId = (event.node.req.url || '').split('?runId=')[1]?.split('&')[0]
  if (!projectId || !runId) throw createError({ statusCode: 400, statusMessage: 'projectId and runId required' })

  const db = prisma as any
  const run = await db.projectRun.findFirst({ where: { id: runId, projectId, userId: user.id } })
  if (!run) throw createError({ statusCode: 404, statusMessage: 'Run not found' })

  const res = event.node.res
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')
  // @ts-ignore
  res.flushHeaders && res.flushHeaders()

  const send = (name: string, data: any) => {
    res.write(`event: ${name}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  let lastId = 0
  const interval = setInterval(async () => {
    try {
      const events = await db.projectRunEvent.findMany({
        where: { runId, id: { gt: lastId } },
        orderBy: { id: 'asc' },
        take: 50,
      })
      for (const evt of events) {
        lastId = evt.id
        send(evt.type, evt.payload)
      }
      const r = await db.projectRun.findUnique({ where: { id: runId } })
      if (!r) {
        clearInterval(interval)
        res.end()
        return
      }
      if (r.status === 'finished' || r.status === 'error') {
        send('run:status', { status: r.status })
        clearInterval(interval)
        res.end()
      }
    } catch (e) {
      clearInterval(interval)
      try { res.end() } catch {}
    }
  }, 1000)
})


