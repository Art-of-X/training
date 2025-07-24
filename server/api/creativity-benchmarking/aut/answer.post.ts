import { z } from 'zod';
import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';

const autAnswerSchema = z.object({
    questionId: z.number(),
    uses: z.array(z.string()).min(1, 'At least one use is required')
});

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    const body = await readBody(event);
    const validation = autAnswerSchema.safeParse(body);

    if (!validation.success) {
        throw createError({ 
            statusCode: 400, 
            message: 'Invalid submission data', 
            data: validation.error.format() 
        });
    }

    const { questionId, uses } = validation.data;

    try {
        // Check if user already answered this question
        const existingAnswer = await prisma.aUTAnswer.findFirst({
            where: {
                userId: user.id,
                questionId: questionId
            }
        });

        let result;
        if (existingAnswer) {
            // Update existing answer
            result = await prisma.aUTAnswer.update({
                where: { id: existingAnswer.id },
                data: { uses: uses }
            });
        } else {
            // Create new answer
            result = await prisma.aUTAnswer.create({
                data: {
                    userId: user.id,
                    questionId: questionId,
                    uses: uses
                }
            });
        }

        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error saving AUT answer:', error);
        throw createError({ statusCode: 500, message: 'Failed to save answer' });
    }
}); 