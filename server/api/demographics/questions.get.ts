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
    // Read questions from JSON file
    const jsonPath = path.join(process.cwd(), 'data', 'demographics.json')
    const jsonContent = await fs.readFile(jsonPath, 'utf-8')
    const { demographics } = JSON.parse(jsonContent)

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
  } catch (error) {
    console.error('Error fetching demographics questions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
}) 