import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const count = await prisma.rATQuestion.count();
    const skip = Math.floor(Math.random() * count);
    const question = await prisma.rATQuestion.findFirst({
      skip: skip,
    });

    if (!question) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No RAT questions found',
      });
    }

    return question;
  } catch (error) {
    console.error('Error fetching RAT question:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    });
  }
}); 