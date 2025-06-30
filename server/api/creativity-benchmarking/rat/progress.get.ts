import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const total = await prisma.rATQuestion.count();
    
    const answeredRecords = await prisma.rATAnswer.findMany({
        where: { userId: user.id },
        select: { questionId: true },
        distinct: ['questionId']
    })
    
    const answered = answeredRecords.length;

    return { answered, total };
  } catch (error) {
    console.error('Error fetching RAT progress:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    });
  }
}); 