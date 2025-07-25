import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

export default defineEventHandler(async (event) => {
  try {
    // Ensure user is authenticated
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // Read questions from JSON file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const questionsPath = path.join(__dirname, '..', '..', '..', 'public', 'data', 'monologue-questions.json')
    const questionsContent = await fs.readFile(questionsPath, 'utf-8')
    const { questions } = JSON.parse(questionsContent)

    return {
      success: true,
      data: questions
    }
  } catch (error: any) {
    // Re-throw createError instances
    if (error.statusCode) {
      throw error
    }

    // Handle unexpected errors
    console.error('Error fetching monologue questions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
}) 