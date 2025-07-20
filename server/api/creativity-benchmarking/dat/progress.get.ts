import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    try {
        // Check if user has submitted DAT
        const submissionCount = await prisma.dATSubmission.count({
            where: { userId: user.id },
        });
        
        const hasSubmitted = submissionCount > 0;

        return { hasSubmitted };
    } catch (error: any) {
        console.error('Error fetching DAT progress:', error);
        throw createError({ statusCode: 500, message: 'Failed to get DAT progress' });
    }
}); 