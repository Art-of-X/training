import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../../utils/prisma'
import fs from 'fs/promises'
import path from 'path'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    // Get total questions from JSON file
    const questionsPath = path.join(process.cwd(), 'public', 'data', 'aut-questions.json')
    const questionsContent = await fs.readFile(questionsPath, 'utf-8')
    const { questions } = JSON.parse(questionsContent)
    const total = questions.length
    
    const answeredRecords = await prisma.aUTAnswer.findMany({
        where: { userId: user.id },
        select: { questionId: true },
        distinct: ['questionId']
    })
    
    const answered = answeredRecords.length;

    return { answered, total };
  } catch (error) {
    console.error('Error fetching AUT progress:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    });
  }
}); 