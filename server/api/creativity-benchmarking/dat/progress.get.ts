import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const submissionCount = await prisma.dATSubmission.count({
        where: { userId: user.id }
    });
    
    return { hasSubmitted: submissionCount > 0 };
  } catch (error) {
    console.error('Error fetching DAT progress:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    });
  }
}); 