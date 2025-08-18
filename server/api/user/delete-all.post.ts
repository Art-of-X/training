import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Wrap in a transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      const userId = user.id

      // Delete chat sessions (cascade will remove messages)
      await tx.chatSession.deleteMany({ where: { userId } })

      // Delete voice agent recordings
      await tx.voiceAgentRecording.deleteMany({ where: { userId } })

      // Delete creativity benchmarking data
      await tx.aUTAnswer.deleteMany({ where: { userId } })
      await tx.rATAnswer.deleteMany({ where: { userId } })
      await tx.dATSubmission.deleteMany({ where: { userId } })

      // Delete demographics answers
      await tx.demographicsAnswer.deleteMany({ where: { userId } })

      // Delete monologue recordings
      await tx.monologueRecording.deleteMany({ where: { userId } })

      // Delete portfolio items
      await tx.portfolioItem.deleteMany({ where: { userId } })

      // Delete project runs and events via cascade by deleting projects (runs have onDelete Cascade)
      // Delete projects (cascades: contextItems, outputs, runs, join table)
      await tx.project.deleteMany({ where: { userId } })

      // Delete sparks owned by user (patterns via relation on SparkPatterns will cascade)
      await tx.spark.deleteMany({ where: { userId } })

      // Delete user patterns (user-authored), predefined patterns remain global
      await tx.pattern.deleteMany({ where: { userId } })

      // Delete preferences
      await tx.userPreferences.deleteMany({ where: { userId } })

      // Finally, delete the user profile itself
      await tx.userProfile.deleteMany({ where: { id: userId } })
    })

    return { success: true }
  } catch (error: any) {
    console.error('Failed to delete all user data:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete all data' })
  }
})


