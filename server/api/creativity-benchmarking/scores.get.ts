import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';
import { readJsonData } from '../../utils/data';

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    try {
        // Get total questions for each test
        const autData = await readJsonData('aut-questions.json');
        const ratData = await readJsonData('rat-questions.json');
        const autQuestions = autData.questions || autData;
        const ratQuestions = ratData.questions || ratData;

        // Get user's AUT responses
        const autAnswers = await prisma.aUTAnswer.findMany({
            where: { userId: user.id },
            orderBy: { questionId: 'asc' }
        });

        // Get user's RAT responses  
        const ratAnswers = await prisma.rATAnswer.findMany({
            where: { userId: user.id },
            orderBy: { questionId: 'asc' }
        });

        // Get user's DAT submission
        const datSubmission = await prisma.dATSubmission.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate AUT scores
        const autScore = {
            questionsCompleted: autAnswers.length,
            totalQuestions: autQuestions.length,
            totalUses: autAnswers.reduce((sum, answer) => sum + answer.uses.length, 0),
            averageUsesPerQuestion: autAnswers.length > 0 
                ? autAnswers.reduce((sum, answer) => sum + answer.uses.length, 0) / autAnswers.length 
                : 0,
            responses: autAnswers.map(answer => ({
                questionId: answer.questionId,
                object: autQuestions.find((q: any) => q.id === answer.questionId)?.object,
                usesCount: answer.uses.length,
                uses: answer.uses
            }))
        };

        // Calculate RAT scores
        const ratScore = {
            questionsCompleted: ratAnswers.length,
            totalQuestions: ratQuestions.length,
            responses: ratAnswers.map(answer => ({
                questionId: answer.questionId,
                word1: ratQuestions.find((q: any) => q.id === answer.questionId)?.word1,
                word2: ratQuestions.find((q: any) => q.id === answer.questionId)?.word2,
                word3: ratQuestions.find((q: any) => q.id === answer.questionId)?.word3,
                answer: answer.answer
            }))
        };

        // Calculate DAT scores
        const datScore = {
            hasSubmitted: !!datSubmission,
            words: datSubmission?.words || [],
            wordsCount: datSubmission?.words?.length || 0,
            submittedAt: datSubmission?.createdAt
        };

        // Calculate overall completion percentage
        const totalPossibleTests = autQuestions.length + ratQuestions.length + 1; // +1 for DAT
        const completedTests = autAnswers.length + ratAnswers.length + (datSubmission ? 1 : 0);
        const completionPercentage = (completedTests / totalPossibleTests) * 100;

        return {
            userId: user.id,
            completionPercentage,
            totalTests: {
                completed: completedTests,
                total: totalPossibleTests
            },
            aut: autScore,
            rat: ratScore,
            dat: datScore,
            summary: {
                autCompleted: autAnswers.length === autQuestions.length,
                ratCompleted: ratAnswers.length === ratQuestions.length,
                datCompleted: !!datSubmission,
                allTestsCompleted: completedTests === totalPossibleTests
            }
        };

    } catch (error: any) {
        console.error('Error fetching creativity scores:', error);
        throw createError({ statusCode: 500, message: 'Failed to get creativity scores' });
    }
}); 