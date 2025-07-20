import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~/server/utils/prisma';
import { PrismaClient } from '@prisma/client';

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    // Fetch all chat sessions for the user, including their messages
    const chatSessions = await (prisma as PrismaClient).chatSession.findMany({
      where: {
        userId: user.id,
      },
      include: {
        chatMessages: { // Corrected relation name
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Show most recent sessions first
      },
    });

    // We only want to return sessions that have messages.
    const sessionsWithMessages = chatSessions.filter(session => session.chatMessages.length > 0);

    return sessionsWithMessages;

  } catch (e: any) {
    console.error('Error fetching chat history:', e);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch chat history.'
    });
  }
}); 