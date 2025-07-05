import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

// A Zod schema for the allowed model names, derived from your Prisma schema.
// This prevents the AI from trying to query a non-existent or disallowed model.
const allowedModels = z.enum([
    'UserProfile',
    'PortfolioItem',
    'MonologueRecording',
    'AUTAnswer',
    'RATAnswer',
    'DATSubmission',
    'DemographicsAnswer',
]);

// Helper function to generate a schema description string for the AI.
function getModelSchemas() {
    const models = Prisma.dmmf.datamodel.models.filter(model => allowedModels.options.includes(model.name as any));
    
    return models.map((model: Prisma.DMMF.Model) => {
        const fieldDescriptions = model.fields.map((field: Prisma.DMMF.Field) => {
            // We don't need to expose the user relation fields to the AI, it's handled automatically.
            if(field.name === 'user' || field.name === 'userId') return null;
            return `    ${field.name}: ${field.type}`;
        }).filter(Boolean); // filter out nulls
        
        return `${model.name}:\n${fieldDescriptions.join('\n')}`;
    }).join('\n\n');
}

const modelSchemaString = getModelSchemas();

// A Zod schema for the arguments that can be passed to a Prisma query.
// This provides structure and validation for the AI's requests.
const queryArgsSchema = z.object({
    where: z.record(z.any()).optional().describe('Filter conditions for the query, e.g., { questionId: 123 }'),
    select: z.record(z.any()).optional().describe('The fields to return from the database.'),
    distinct: z.array(z.string()).optional().describe('Filter for distinct records based on a field.'),
}).optional();


/**
 * A factory function that creates a secure, dynamic database query tool.
 * @param userId The ID of the currently authenticated user.
 * @returns A tool that can be used by the AI to query the database.
 */
export const createDatabaseQueryTool = (userId: string) => tool({
    description: `Use this tool to query the application's database to find the answer to a user's question. You MUST specify the data model to query. All queries are automatically filtered by the current user's ID.

**IMPORTANT**: To check progress or get counts, use the 'count' queryType instead of 'findMany' to be more efficient. For example, to count portfolio items, use { model: 'PortfolioItem', queryType: 'count' }.

Available models and their schemas:
---
${modelSchemaString}
---
`,
    parameters: z.object({
        model: allowedModels,
        queryType: z.enum(['findMany', 'count', 'findFirst']).describe("The type of query to run: 'findMany' to get a list of records, 'count' to get a number of records, or 'findFirst' to get a single record."),
        args: queryArgsSchema,
    }),
    execute: async ({ model, queryType, args }) => {
        // The prisma client has lowercase model names, e.g., `prisma.userProfile`.
        const modelName = (model.charAt(0).toLowerCase() + model.slice(1)) as Uncapitalize<typeof model>;
        
        // IMPORTANT: Automatically inject the user's ID into every 'where' clause for security.
        // This prevents the AI from accessing data belonging to other users.
        const userFilter = model === 'UserProfile' ? { id: userId } : { userId: userId };
        const secureWhere = { ...args?.where, ...userFilter };

        // Sanitize the 'select' arguments to prevent fetching large relational data
        let secureSelect = args?.select;
        if (secureSelect) {
            const modelInfo = Prisma.dmmf.datamodel.models.find(m => m.name === model);
            if (modelInfo) {
                const relationFields = new Set(modelInfo.fields.filter(f => f.kind === 'object').map(f => f.name));
                const requestedFields = Object.keys(secureSelect);
                const requestedRelationFields = requestedFields.filter(f => relationFields.has(f));

                if (requestedRelationFields.length > 0) {
                    console.warn(`AI requested relational fields: [${requestedRelationFields.join(', ')}]. These have been stripped to prevent data overload.`);
                    secureSelect = { ...secureSelect };
                    for (const field of requestedRelationFields) {
                        delete secureSelect[field];
                    }
                    if (Object.keys(secureSelect).length === 0) {
                        secureSelect = undefined; // If no fields are left, let Prisma fetch the default scalar fields.
                    }
                }
            }
        }

        console.log(`Executing query: ${modelName}.${queryType} with args:`, JSON.stringify({ where: secureWhere, select: secureSelect, distinct: args?.distinct }, null, 2));

        try {
            // @ts-ignore - We are dynamically calling the Prisma client method.
            // The validation and security checks make this safe.
            const result = await prisma[modelName][queryType]({
                where: secureWhere,
                select: secureSelect,
                distinct: args?.distinct,
            });

            return { success: true, data: result };
        } catch (error: any) {
            console.error(`Error querying model ${model}:`, error);
            return { success: false, error: `Failed to query ${model}: ${error.message}` };
        }
    }
});

// This is the actual implementation of the tool logic.
async function getUnansweredDemographicsQuestions(userId: string) {
    const questionsPath = path.join(process.cwd(), 'public', 'data', 'demographics.json');
    const questionsContent = await fs.readFile(questionsPath, 'utf-8');
    const { demographics } = JSON.parse(questionsContent);

    const existingAnswers = await prisma.demographicsAnswer.findMany({
      where: { userId: userId },
      select: { questionKey: true }
    });
    const answeredKeys = existingAnswers.map(a => a.questionKey);

    const unansweredQuestions = demographics.filter((q: any) => !answeredKeys.includes(q.key));

    return unansweredQuestions.map((q:any) => ({ question: q.label, key: q.key, options: q.options }));
}

// This is the tool definition that the AI will see.
export const createGetDemographicsTool = (userId: string) => tool({
    description: 'Get the list of unanswered demographic questions for the user. Use this to ask the user for their demographic information.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const questions = await getUnansweredDemographicsQuestions(userId);
            return {
                questions: questions,
                count: questions.length,
            }
        } catch (error) {
            console.error('Error in getDemographicsTool:', error);
            return { error: 'Failed to get demographics questions.' };
        }
    }
});

async function getMonologueProgress(userId: string) {
    const questionsPath = path.join(process.cwd(), 'public', 'data', 'monologue-questions.json');
    const questionsContent = await fs.readFile(questionsPath, 'utf-8');
    const { questions } = JSON.parse(questionsContent);
    const total = questions.length;

    const answeredRecords = await prisma.monologueRecording.findMany({
        where: { userId: userId },
        select: { questionId: true },
        distinct: ['questionId']
    });
    
    const answered = answeredRecords.length;
    return { answered, total };
}

export const createGetMonologueProgressTool = (userId: string) => tool({
    description: 'Get the user\'s progress in the monologue module. This tells you how many questions they have answered out of the total.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const progress = await getMonologueProgress(userId);
            return progress;
        } catch (error) {
            console.error('Error in getMonologueProgressTool:', error);
            return { error: 'Failed to get monologue progress.' };
        }
    }
});

async function getOverallProgress(userId: string) {
    async function readJsonData(filePath: string) {
        try {
            const fullPath = path.join(process.cwd(), 'public', 'data', filePath);
            const fileContent = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(fileContent);
            if (typeof data === 'object' && data !== null && Array.isArray(data.questions)) {
                return data.questions;
            }
            if (Array.isArray(data)) {
                return data;
            }
            return [];
        } catch (error) {
            console.error(`Error reading or parsing JSON file at ${filePath}:`, error);
            return [];
        }
    }

    const [
        monologueQuestions, 
        autQuestions, 
        ratQuestions, 
    ] = await Promise.all([
      readJsonData('monologue-questions.json'),
      readJsonData('aut-questions.json'),
      readJsonData('rat-questions.json'),
    ]);

    const [
      portfolioCount,
      answeredMonologueIds,
      answeredAutIds,
      answeredRatIds,
      datSubmissionCount,
      demographicsAnswerCount,
    ] = await Promise.all([
      prisma.portfolioItem.count({ where: { userId: userId } }),
      prisma.monologueRecording.findMany({
        where: { userId: userId },
        select: { questionId: true },
      }).then(records => [...new Set(records.map(r => r.questionId))]),
      prisma.aUTAnswer.findMany({
        where: { userId: userId },
        select: { questionId: true },
      }).then(answers => [...new Set(answers.map(a => a.questionId))]),
      prisma.rATAnswer.findMany({
        where: { userId: userId },
        select: { questionId: true },
      }).then(answers => [...new Set(answers.map(a => a.questionId))]),
      prisma.dATSubmission.count({ where: { userId: userId } }),
      prisma.demographicsAnswer.count({
        where: { userId: userId },
      }),
    ]);
    
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
        total: 10,
      },
      monologue: {
        completed: answeredMonologueIds.length,
        total: monologueQuestions.length,
      },
      creativity: {
        completed: creativityProgress,
        total: 3,
      },
      demographics: {
        completed: demographicsAnswerCount > 0 ? 1 : 0,
        total: 1,
      },
    };
}

export const createGetOverallProgressTool = (userId: string) => tool({
    description: 'Get an overview of the user\'s progress across all training modules: portfolio, monologue, creativity, and demographics.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const progress = await getOverallProgress(userId);
            return progress;
        } catch (error) {
            console.error('Error in getOverallProgressTool:', error);
            return { error: 'Failed to get overall progress.' };
        }
    }
}); 