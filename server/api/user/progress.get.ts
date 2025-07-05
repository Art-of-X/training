import { serverSupabaseUser } from '#supabase/server';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();

async function readJsonData(filePath: string) {
  try {
    const fullPath = path.join(process.cwd(), 'public', 'data', filePath);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const data = JSON.parse(fileContent);
    // If data is an object and has a 'questions' property, return that array.
    if (typeof data === 'object' && data !== null && Array.isArray(data.questions)) {
      return data.questions;
    }
    // If data is already an array, return it directly.
    if (Array.isArray(data)) {
      return data;
    }
    // Otherwise, return an empty array as a fallback.
    return [];
  } catch (error) {
    console.error(`Error reading or parsing JSON file at ${filePath}:`, error);
    return [];
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  try {
    // Read question files in parallel
    const [
        monologueQuestions, 
        autQuestions, 
        ratQuestions, 
    ] = await Promise.all([
      readJsonData('monologue-questions.json'),
      readJsonData('aut-questions.json'),
      readJsonData('rat-questions.json'),
    ]);

    // Fetch user progress data in parallel
    const [
      portfolioCount,
      answeredMonologueIds,
      answeredAutIds,
      answeredRatIds,
      datSubmissionCount,
      demographicsAnswerCount,
    ] = await Promise.all([
      prisma.portfolioItem.count({ where: { userId: user.id } }),
      prisma.monologueRecording.findMany({
        where: { userId: user.id },
        select: { questionId: true },
      }).then(records => [...new Set(records.map(r => r.questionId))]),
      prisma.aUTAnswer.findMany({
        where: { userId: user.id },
        select: { questionId: true },
      }).then(answers => [...new Set(answers.map(a => a.questionId))]),
      prisma.rATAnswer.findMany({
        where: { userId: user.id },
        select: { questionId: true },
      }).then(answers => [...new Set(answers.map(a => a.questionId))]),
      prisma.dATSubmission.count({ where: { userId: user.id } }),
      prisma.demographicsAnswer.count({
        where: { userId: user.id },
      }),
    ]);
    
    // Calculate creativity progress
    const autCompleted = answeredAutIds.length > 0 && autQuestions.length > 0 && answeredAutIds.length >= autQuestions.length;
    const ratCompleted = answeredRatIds.length > 0 && ratQuestions.length > 0 && answeredRatIds.length >= ratQuestions.length;
    const datCompleted = datSubmissionCount > 0;
    
    let creativityProgress = 0;
    if (autCompleted) creativityProgress++;
    if (ratCompleted) creativityProgress++;
    if (datCompleted) creativityProgress++;

    return {
      portfolio: {
        completed: portfolioCount,
        total: 10, // Aim for 10 portfolio items
      },
      monologue: {
        completed: answeredMonologueIds.length,
        total: monologueQuestions.length,
      },
      creativity: {
        completed: creativityProgress,
        total: 3, // AUT, RAT, DAT
      },
      demographics: {
        completed: demographicsAnswerCount > 0 ? 1 : 0,
        total: 1,
      },
    };

  } catch (error: any) {
    console.error('Error fetching user progress:', error);
    throw createError({ statusCode: 500, statusMessage: 'Failed to get user progress', data: error.message });
  }
}); 