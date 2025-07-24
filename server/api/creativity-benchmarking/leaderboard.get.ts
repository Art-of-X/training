import { prisma } from '~/server/utils/prisma';
import { serverSupabaseUser } from '#supabase/server';
import { readJsonData } from '../../utils/data';

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event);
    if (!user) {
        throw createError({ statusCode: 401, message: 'Unauthorized' });
    }

    try {
        // Get test structure
        const autData = await readJsonData('aut-questions.json');
        const ratData = await readJsonData('rat-questions.json');
        const autQuestions = autData.questions || autData;
        const ratQuestions = ratData.questions || ratData;

        // Get all users who have participated in creativity tests
        const allUsers = await prisma.userProfile.findMany({
            where: {
                OR: [
                    { autAnswers: { some: {} } },
                    { ratAnswers: { some: {} } },
                    { datSubmissions: { some: {} } }
                ]
            },
            include: {
                autAnswers: true,
                ratAnswers: true,
                datSubmissions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        // Calculate scores for each user
        const userScores = allUsers.map(user => {
            const autAnswers = user.autAnswers;
            const ratAnswers = user.ratAnswers;
            const datSubmission = user.datSubmissions[0];

            // AUT metrics
            const autTotalUses = autAnswers.reduce((sum, answer) => sum + answer.uses.length, 0);
            const autAverage = autAnswers.length > 0 ? autTotalUses / autAnswers.length : 0;
            const autCompletionRate = autAnswers.length / autQuestions.length;

            // RAT metrics
            const ratCompletionRate = ratAnswers.length / ratQuestions.length;

            // DAT metrics
            const datCompleted = !!datSubmission;

            // Overall creativity score (weighted combination)
            const creativityScore = (
                (autAverage * 0.4) +           // AUT: fluency weight
                (ratCompletionRate * 100 * 0.3) + // RAT: completion weight
                (datCompleted ? 100 : 0) * 0.3     // DAT: completion weight
            );

            return {
                userId: user.id,
                name: user.name || 'Anonymous',
                creativityScore: Math.round(creativityScore * 100) / 100,
                metrics: {
                    aut: {
                        questionsAnswered: autAnswers.length,
                        totalQuestions: autQuestions.length,
                        totalUses: autTotalUses,
                        averageUsesPerQuestion: Math.round(autAverage * 100) / 100,
                        completionRate: Math.round(autCompletionRate * 100)
                    },
                    rat: {
                        questionsAnswered: ratAnswers.length,
                        totalQuestions: ratQuestions.length,
                        completionRate: Math.round(ratCompletionRate * 100)
                    },
                    dat: {
                        completed: datCompleted,
                        wordsSubmitted: datSubmission?.words?.length || 0
                    }
                },
                overallCompletion: Math.round(
                    ((autAnswers.length + ratAnswers.length + (datCompleted ? 1 : 0)) / 
                     (autQuestions.length + ratQuestions.length + 1)) * 100
                )
            };
        });

        // Sort by creativity score (descending)
        userScores.sort((a, b) => b.creativityScore - a.creativityScore);

        // Add ranking
        const rankedUsers = userScores.map((user, index) => ({
            ...user,
            rank: index + 1
        }));

        return {
            totalParticipants: rankedUsers.length,
            leaderboard: rankedUsers,
            testStructure: {
                autQuestions: autQuestions.length,
                ratQuestions: ratQuestions.length,
                datTasks: 1,
                totalTests: autQuestions.length + ratQuestions.length + 1
            }
        };

    } catch (error: any) {
        console.error('Error fetching creativity leaderboard:', error);
        throw createError({ statusCode: 500, message: 'Failed to get creativity leaderboard' });
    }
}); 