import { z } from 'zod';
import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';

const ratAnswerSchema = z.object({
    questionId: z.number(),
    answer: z.string().min(1, 'Answer is required')
});

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    const body = await readBody(event);
    const validation = ratAnswerSchema.safeParse(body);

    if (!validation.success) {
        throw createError({ 
            statusCode: 400, 
            message: 'Invalid submission data', 
            data: validation.error.format() 
        });
    }

    const { questionId, answer } = validation.data;

    try {
        // Check if user already answered this question
        const existingAnswer = await prisma.rATAnswer.findFirst({
            where: {
                userId: user.id,
                questionId: questionId
            }
        });

        let result;
        if (existingAnswer) {
            // Update existing answer
            result = await prisma.rATAnswer.update({
                where: { id: existingAnswer.id },
                data: { answer: answer.trim() }
            });
        } else {
            // Create new answer
            result = await prisma.rATAnswer.create({
                data: {
                    userId: user.id,
                    questionId: questionId,
                    answer: answer.trim()
                }
            });
        }

        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error saving RAT answer:', error);
        throw createError({ statusCode: 500, message: 'Failed to save answer' });
    }
}); 