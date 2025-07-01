import { defineEventHandler, createError, readBody } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { answers } = await readBody(event)

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: answers array is required',
    })
  }

  try {
    // Process each answer
    const results = []
    for (const answerData of answers) {
      const { questionKey, answer } = answerData
      
      if (!questionKey || answer === undefined || answer === null) {
        continue // Skip invalid entries
      }

      // Upsert the answer (update if exists, create if not)
      const result = await prisma.demographicsAnswer.upsert({
        where: {
          userId_questionKey: {
            userId: user.id,
            questionKey: questionKey
          }
        },
        update: {
          answer: String(answer)
        },
        create: {
          userId: user.id,
          questionKey: questionKey,
          answer: String(answer)
        }
      })
      
      results.push(result)
    }

    return { success: true, answersSubmitted: results.length }
  } catch (error) {
    console.error('Error submitting demographics answers:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
}) 