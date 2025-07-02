import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../utils/prisma'
import fs from 'fs/promises'
import path from 'path'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Read demographics questions from JSON file
    const questionsPath = path.join(process.cwd(), 'public', 'data', 'demographics.json')
    const questionsContent = await fs.readFile(questionsPath, 'utf-8')
    const { demographics } = JSON.parse(questionsContent)

    // Get user's existing answers
    const existingAnswers = await prisma.demographicsAnswer.findMany({
      where: {
        userId: user.id
      }
    })

    // Map existing answers for quick lookup
    const answersMap = existingAnswers.reduce((acc: Record<string, string>, answer: any) => {
      acc[answer.questionKey] = answer.answer
      return acc
    }, {} as Record<string, string>)

    // Return questions with existing answers
    const questionsWithAnswers = demographics
      .sort((a: any, b: any) => a.order - b.order)
      .map((question: any) => ({
        ...question,
        currentAnswer: answersMap[question.key] || null
      }))

    return questionsWithAnswers
  } catch (error: any) {
    // Re-throw createError instances
    if (error.statusCode) {
      throw error
    }

    // Handle unexpected errors
    console.error('Error fetching demographics questions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
}) 