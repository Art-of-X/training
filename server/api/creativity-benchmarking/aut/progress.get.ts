import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';
import { readJsonData } from '../../../utils/data';

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    try {
        // Get total questions
        const data = await readJsonData('aut-questions.json');
        const questions = data.questions || data;
        const total = questions.length;
        
        // Get answered questions count
        const answeredRecords = await prisma.aUTAnswer.findMany({
            where: { userId: user.id },
            select: { questionId: true },
            distinct: ['questionId'],
        });
        const answered = answeredRecords.length;

        return { answered, total };
    } catch (error: any) {
        console.error('Error fetching AUT progress:', error);
        throw createError({ statusCode: 500, message: 'Failed to get AUT progress' });
    }
}); 