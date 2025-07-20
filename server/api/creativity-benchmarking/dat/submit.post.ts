import { z } from 'zod';
import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';

const datSubmissionSchema = z.object({
    words: z.array(z.string()).length(10, 'Exactly 10 words are required')
});

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    const body = await readBody(event);
    const validation = datSubmissionSchema.safeParse(body);

    if (!validation.success) {
        throw createError({ 
            statusCode: 400, 
            message: 'Invalid submission data', 
            data: validation.error.format() 
        });
    }

    const { words } = validation.data;

    // Trim and validate words
    const cleanWords = words.map(word => word.trim()).filter(word => word.length > 0);
    
    if (cleanWords.length !== 10) {
        throw createError({ 
            statusCode: 400, 
            message: 'All 10 words must be non-empty' 
        });
    }

    try {
        // Check if user has already submitted DAT (for research validity)
        const existingSubmission = await prisma.dATSubmission.findFirst({
            where: { userId: user.id }
        });

        if (existingSubmission) {
            throw createError({ 
                statusCode: 400, 
                message: 'DAT can only be completed once for research validity. Your previous submission has been recorded.' 
            });
        }

        const result = await prisma.dATSubmission.create({
            data: {
                userId: user.id,
                words: cleanWords
            }
        });

        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error saving DAT submission:', error);
        if (error.statusCode === 400) {
            throw error; // Re-throw our custom validation error
        }
        throw createError({ statusCode: 500, message: 'Failed to save submission' });
    }
}); 