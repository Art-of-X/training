import { z } from 'zod';
import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';
import { readJsonData } from '../../utils/data';

const progressQuerySchema = z.object({
  type: z.enum(['aut', 'rat', 'dat']),
});

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    const query = getQuery(event);
    const validation = progressQuerySchema.safeParse(query);

    if (!validation.success) {
        throw createError({ statusCode: 400, message: 'Invalid submission type' });
    }

    const { type } = validation.data;

    try {
        let total = 0;
        let answered = 0;

        if (type === 'aut') {
            const questions = await readJsonData(`aut-questions.json`);
            total = questions.length;
            const answeredRecords = await prisma.aUTAnswer.findMany({
                where: { userId: user.id },
                select: { questionId: true },
                distinct: ['questionId'],
            });
            answered = answeredRecords.length;
        } else if (type === 'rat') {
            const questions = await readJsonData(`rat-questions.json`);
            total = questions.length;
            const answeredRecords = await prisma.rATAnswer.findMany({
                where: { userId: user.id },
                select: { questionId: true },
                distinct: ['questionId'],
            });
            answered = answeredRecords.length;
        } else if (type === 'dat') {
            total = 1; // DAT is a single submission task
            const submissionCount = await prisma.dATSubmission.count({
                where: { userId: user.id },
            });
            answered = submissionCount > 0 ? 1 : 0;
        }

        return { type, answered, total };
    } catch (error: any) {
        console.error(`Error fetching ${type} progress:`, error);
        throw createError({ statusCode: 500, message: `Failed to get ${type} progress` });
    }
}); 