import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';
import { readJsonData } from '../../../utils/data';

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    try {
        // Get all AUT questions (standardized test battery)
        const data = await readJsonData('aut-questions.json');
        const questions = data.questions || data; // Handle both formats
        
        // Get questions already answered by this user
        const answeredQuestions = await prisma.aUTAnswer.findMany({
            where: { userId: user.id },
            select: { questionId: true },
            distinct: ['questionId']
        });
        
        const answeredIds = new Set(answeredQuestions.map(a => a.questionId));
        
        // Return the NEXT question in sequence (standardized order)
        for (const question of questions) {
            if (!answeredIds.has(question.id)) {
                return question;
            }
        }
        
        // If all questions completed, return first question to allow review/retaking
        return questions[0];
        
    } catch (error: any) {
        console.error('Error getting AUT question:', error);
        throw createError({ statusCode: 500, message: 'Failed to get AUT question' });
    }
}); 