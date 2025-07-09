import { z } from 'zod';
import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';

const submissionBodySchema = z.object({
  type: z.enum(['aut', 'rat', 'dat']),
  questionId: z.number().optional(),
  answer: z.union([z.string(), z.array(z.string())]).optional(),
});

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    const body = await readBody(event);
    const validation = submissionBodySchema.safeParse(body);

    if (!validation.success) {
        return { success: false, error: 'Invalid submission body.', details: validation.error.format() };
    }

    const { type, questionId, answer } = validation.data;

    try {
        let result;
        switch (type) {
            case 'aut':
                if (typeof questionId !== 'number' || !Array.isArray(answer)) {
                    throw createError({ statusCode: 400, message: 'questionId and an array of answers are required for AUT.' });
                }
                result = await prisma.aUTAnswer.create({
                    data: {
                        userId: user.id,
                        questionId,
                        uses: answer,
                    },
                });
                break;
            case 'rat':
                 if (typeof questionId !== 'number' || typeof answer !== 'string') {
                    throw createError({ statusCode: 400, message: 'questionId and a string answer are required for RAT.' });
                }
                result = await prisma.rATAnswer.create({
                    data: {
                        userId: user.id,
                        questionId,
                        answer: answer,
                    },
                });
                break;
            case 'dat':
                if (!Array.isArray(answer)) {
                     throw createError({ statusCode: 400, message: 'An array of words is required for DAT.' });
                }
                result = await prisma.dATSubmission.create({
                    data: {
                        userId: user.id,
                        words: answer,
                    },
                });
                break;
            default:
                throw createError({ statusCode: 400, message: 'Invalid submission type.' });
        }
        return { success: true, data: result };
    } catch (error: any) {
        console.error(`Error processing ${type} submission:`, error);
        return createError({ statusCode: 500, message: `Failed to process submission: ${error.message}` });
    }
}); 