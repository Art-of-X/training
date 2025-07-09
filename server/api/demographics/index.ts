import { defineEventHandler, createError, readBody, isMethod } from 'h3';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '../../utils/prisma';
import { readJsonData } from '../../utils/data';

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    // Handle GET request to fetch questions and existing answers
    if (isMethod(event, 'GET')) {
        try {
            const questions = await readJsonData('demographics.json');

            const existingAnswers = await prisma.demographicsAnswer.findMany({
                where: { userId: user.id }
            });

            const answersMap = existingAnswers.reduce((acc, answer) => {
                acc[answer.questionKey] = answer.answer;
                return acc;
            }, {} as Record<string, string>);

            const questionsWithAnswers = questions
                .sort((a: any, b: any) => a.order - b.order)
                .map((question: any) => ({
                    ...question,
                    currentAnswer: answersMap[question.key] || null
                }));

            return questionsWithAnswers;
        } catch (error: any) {
            console.error('Error fetching demographics questions:', error);
            throw createError({ statusCode: 500, statusMessage: 'Internal server error' });
        }
    }

    // Handle POST request to submit answers
    if (isMethod(event, 'POST')) {
        const { answers } = await readBody(event);

        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            throw createError({ statusCode: 400, statusMessage: 'Bad Request: answers array is required' });
        }

        try {
            const results = [];
            for (const answerData of answers) {
                const { questionKey, answer } = answerData;
                if (!questionKey || answer === undefined || answer === null) {
                    continue; // Skip invalid entries
                }
                
                const result = await prisma.demographicsAnswer.upsert({
                    where: { userId_questionKey: { userId: user.id, questionKey: questionKey } },
                    update: { answer: String(answer) },
                    create: { userId: user.id, questionKey: questionKey, answer: String(answer) }
                });
                results.push(result);
            }
            return { success: true, answersSubmitted: results.length };
        } catch (error) {
            console.error('Error submitting demographics answers:', error);
            throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
        }
    }

    // Handle other methods
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
}); 