import { defineEventHandler, isMethod, readBody, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (isMethod(event, 'GET')) {
    try {
      let prefs = await prisma.userPreferences.findUnique({ where: { userId: user.id } })
      if (!prefs) {
        prefs = await prisma.userPreferences.create({
          data: {
            userId: user.id,
            // defaults from schema: ttsEnabled: true, preferredLanguage: 'en'
          }
        })
      }
      return { data: prefs }
    } catch (error: any) {
      console.error('Failed to fetch user preferences:', error)
      throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
  }

  if (isMethod(event, 'PUT')) {
    try {
      const body = await readBody(event)
      const { preferredLanguage, ttsEnabled, voiceId, memory } = body || {}

      const prefs = await prisma.userPreferences.upsert({
        where: { userId: user.id },
        update: {
          preferredLanguage: typeof preferredLanguage === 'string' ? preferredLanguage : undefined,
          ttsEnabled: typeof ttsEnabled === 'boolean' ? ttsEnabled : undefined,
          voiceId: typeof voiceId === 'string' || voiceId === null ? voiceId : undefined,
          memory: typeof memory === 'string' || memory === null ? memory : undefined,
        },
        create: {
          userId: user.id,
          preferredLanguage: typeof preferredLanguage === 'string' ? preferredLanguage : undefined,
          ttsEnabled: typeof ttsEnabled === 'boolean' ? ttsEnabled : undefined,
          voiceId: typeof voiceId === 'string' ? voiceId : undefined,
          memory: typeof memory === 'string' ? memory : undefined,
        },
      })

      return { data: prefs }
    } catch (error: any) {
      console.error('Failed to update user preferences:', error)
      throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})


