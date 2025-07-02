import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import fs from 'fs/promises'
import path from 'path'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Read AUT questions from JSON file
    const questionsPath = path.join(process.cwd(), 'public', 'data', 'aut-questions.json')
    const questionsContent = await fs.readFile(questionsPath, 'utf-8')
    const { questions } = JSON.parse(questionsContent)

    if (!questions || questions.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No AUT questions found',
      });
    }

    // Return a random question
    const randomIndex = Math.floor(Math.random() * questions.length)
    const question = questions[randomIndex]

    return question;
  } catch (error: any) {
    // Re-throw createError instances
    if (error.statusCode) {
      throw error
    }

    console.error('Error fetching AUT question:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    });
  }
}); 