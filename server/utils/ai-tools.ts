import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { serverSupabaseClient } from '#supabase/server';

// Helper function to read JSON data files.
async function readJsonData(filePath: string) {
    try {
        const fullPath = path.join(process.cwd(), 'public', 'data', filePath);
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        const data = JSON.parse(fileContent);
        // Standardize access to the questions array
        if (data && Array.isArray(data.questions)) {
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

async function getMonologueProgress(userId: string) {
    const questions = await readJsonData('monologue-questions.json');
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

async function getNextQuestion(userId: string) {
    // Get user profile for personalization
    const userProfile = await prisma.userProfile.findUnique({
        where: { id: userId },
        select: { name: true }
    });
    const userName = userProfile?.name || 'Artist';
    
    const progress = await getOverallProgress(userId);
    const portfolioThreshold = 3; // We want at least 3 items to start with.

    // Phase 1: Onboarding & Initial Portfolio Building
    if (progress.portfolio.completed < portfolioThreshold) {
        if (progress.portfolio.completed === 0 && progress.monologue.completed === 0) {
            // This is the user's very first interaction.
            return {
                type: 'greeting_and_portfolio_request',
                module: 'Introduction',
                text: `This is the user's first interaction. Start with "Welcome back, ${userName}!" and then generate a warm, encouraging welcome message. Briefly introduce yourself as their AI partner for this creativity training. Explain that the first step is to get to know them and their work. Then, ask them to introduce themselves and share some examples of their work by providing links (e.g., to their website, social media, or specific pieces) or by uploading files.`,
            };
        } else {
            // User has started but not met the threshold yet.
            return {
                type: 'task',
                module: 'Portfolio', 
                text: `The user ${userName} has added ${progress.portfolio.completed} portfolio item(s) but needs to reach ${portfolioThreshold} to move forward. Guide them to add more items. Be encouraging and contextual - avoid generic phrases like "thanks for sharing." Address them by name when appropriate and ask them to share another piece of their work by providing a link or uploading a file.`
            };
        }
    }

    // Phase 2: Monologue Deep Dive
    const monologueUnanswered = await getUnansweredQuestions(userId, 'monologue');
    if (monologueUnanswered && !('error' in monologueUnanswered) && monologueUnanswered.unansweredCount > 0) {
        const q = monologueUnanswered.unansweredQuestions[0];
        
        const isFirstMonologueQuestion = progress.monologue.completed === 0;
        const introText = isFirstMonologueQuestion
            ? `That's a fantastic start for your portfolio, ${userName}. Now, let's switch gears to some short reflective questions. They're designed to help you think about your creative process. Here's the first one: "${q.text}"`
            : `Great, ${userName}, let's move on to the next reflection. Here's what I'd like you to think about now: "${q.text}"`;

        return {
            type: 'question',
            module: 'Monologue',
            text: introText,
            questionDetails: { id: q.id },
            questionId: q.id
        };
    }

    // Phase 3: All Done (for now)
    // All monologue questions are answered. The user can still add to their portfolio.
    return {
        type: 'done',
        module: 'All Complete',
        text: `Congratulations, ${userName}! You've completed all the monologue questions for now. This is a huge accomplishment. You can always come back to add more items to your portfolio or review your reflections.`
    };
}

async function getOverallProgress(userId: string) {
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

export const createGetNextQuestionTool = (userId: string) => tool({
    description: 'Determines and retrieves the very next single question or task the user should work on to continue their training. Call this to proactively guide the user. It automatically finds where they left off and what the next logical step is.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const nextStep = await getNextQuestion(userId);
            return { success: true, ...nextStep };
        } catch (error: any) {
            console.error('Error in getNextQuestionTool:', error);
            return { success: false, error: `Failed to get next question: ${error.message}` };
        }
    }
});

export const createAddPortfolioLinkTool = (userId: string) => tool({
    description: 'Add a new portfolio item using a URL. Use this when the user provides a link to their work and a description or uploads a file.',
    parameters: z.object({
        link: z.string().url().describe('The URL of the portfolio item.'),
        description: z.string().describe('A description of the portfolio item.'),
    }),
    execute: async ({ link, description }) => {
        if (!userId) {
            return { success: false, error: 'User is not authenticated.' };
        }
        try {
            const newItem = await prisma.portfolioItem.create({
                data: {
                    userId,
                    link,
                    description,
                }
            });
            return { success: true, data: newItem };
        } catch (error: any) {
            console.error(`Error creating portfolio link for user ${userId}:`, error);
            return { success: false, error: `Failed to add portfolio link: ${error.message}` };
        }
    }
});

export const createFinalizeFileUploadTool = (userId: string, event: any) => tool({
    description: "Once the user has provided a temporary file URL and all necessary context (like a description and the target module), use this tool to finalize the upload. This moves the file to its permanent location and saves the metadata to the database.",
    parameters: z.object({
        tempUrl: z.string().url().describe("The temporary URL of the file provided by the user."),
        target: z.enum(['portfolio', 'monologue']).describe("The module this file is for ('portfolio' or 'monologue')."),
        description: z.string().describe("The user-provided description for the file."),
        questionId: z.number().optional().describe("If the target is 'monologue', the ID of the question this file is supplementary to."),
    }),
    execute: async ({ tempUrl, target, description, questionId }) => {
        try {
            const supabase = await serverSupabaseClient(event);
            const bucketName = 'uploads';

            // 1. Parse the temp path from the URL
            const urlParts = tempUrl.split('/');
            const tempPath = urlParts.slice(urlParts.indexOf(bucketName) + 1).join('/');

            if (!tempPath.startsWith('temp/')) {
                return { success: false, error: 'Invalid temporary URL provided.' };
            }

            // 2. Determine the new path
            const fileName = tempPath.split('/').pop();
            let newPath: string;
            if (target === 'portfolio') {
                newPath = `portfolio/${userId}/${fileName}`;
            } else if (target === 'monologue') {
                 if (!questionId) {
                    return { success: false, error: "A questionId is required for monologue file uploads." };
                }
                newPath = `monologue/${userId}/${questionId}/${fileName}`;
            } else {
                return { success: false, error: 'Invalid target specified.' };
            }

            // 3. Copy the file to the new location
            const { error: copyError } = await supabase.storage.from(bucketName).copy(tempPath, newPath);
            if (copyError) {
                console.error('Error copying file:', copyError);
                return { success: false, error: `Failed to move file: ${copyError.message}` };
            }
             const { data: { publicUrl: newPublicUrl } } = supabase.storage.from(bucketName).getPublicUrl(newPath);


            // 4. Create the database record
            if (target === 'portfolio') {
                await prisma.portfolioItem.create({
                    data: {
                        userId,
                        description,
                        filePath: newPublicUrl,
                    },
                });
            } else if (target === 'monologue' && questionId) {
                // This assumes we are adding a supplementary file to an *existing* recording.
                // A more complex flow would be needed to create the recording and file simultaneously.
                 await prisma.monologueRecording.updateMany({
                    where: { userId, questionId },
                    data: {
                        supplementaryFilePath: newPublicUrl,
                        supplementaryDescription: description,
                    },
                });
                // If no record exists, you might want to create one.
                // This simplified version updates existing records.
            }

            // 5. Delete the temporary file
            const { error: deleteError } = await supabase.storage.from(bucketName).remove([tempPath]);
            if (deleteError) {
                // Log the error but don't fail the whole operation, since the file is already copied.
                console.error('Failed to delete temporary file:', deleteError);
            }

            return { success: true, message: `File successfully saved to ${target}.` };
        } catch (error: any) {
            console.error(`Error finalizing file upload for user ${userId}:`, error);
            return { success: false, error: `An unexpected error occurred: ${error.message}` };
        }
    }
});

async function getUnansweredQuestions(userId: string, module: 'monologue' | 'aut' | 'rat' | 'demographics') {
    let questions: any[] = [];
    let answeredIds: Set<number | string>;

    switch (module) {
        case 'monologue':
            questions = await readJsonData('monologue-questions.json');
            const answeredMonologueRecords = await prisma.monologueRecording.findMany({
                where: { userId },
                select: { questionId: true },
            });
            answeredIds = new Set(answeredMonologueRecords.map(r => r.questionId));
            break;
        case 'aut':
            questions = await readJsonData('aut-questions.json');
            const answeredAutRecords = await prisma.aUTAnswer.findMany({
                where: { userId },
                select: { questionId: true },
            });
            answeredIds = new Set(answeredAutRecords.map(a => a.questionId));
            break;
        case 'rat':
            questions = await readJsonData('rat-questions.json');
            const answeredRatRecords = await prisma.rATAnswer.findMany({
                where: { userId },
                select: { questionId: true },
            });
            answeredIds = new Set(answeredRatRecords.map(r => r.questionId));
            break;
        case 'demographics':
            questions = await readJsonData('demographics.json');
            const existingAnswers = await prisma.demographicsAnswer.findMany({
              where: { userId: userId },
              select: { questionKey: true }
            });
            answeredIds = new Set(existingAnswers.map(a => a.questionKey));
            break;
        default:
            return { error: 'Invalid module specified.' };
    }

    const idField = module === 'demographics' ? 'key' : 'id';
    const unansweredQuestions = questions.filter(q => !answeredIds.has(q[idField]));
    
    let responsePayload;

    if (module === 'demographics') {
        responsePayload = unansweredQuestions.map((q: any) => ({ question: q.question, key: q.key, options: q.options }));
    } else {
        responsePayload = unansweredQuestions;
    }

    return {
        module,
        unansweredCount: unansweredQuestions.length,
        totalCount: questions.length,
        unansweredQuestions: responsePayload.slice(0, 5) 
    };
}

export const createGetUnansweredQuestionsTool = (userId: string) => tool({
    description: `Get a list of unanswered questions for a specific module (monologue, aut, rat, demographics). Use this to guide the user on what to do next.`,
    parameters: z.object({
        module: z.enum(['monologue', 'aut', 'rat', 'demographics'])
    }),
    execute: async ({ module }) => {
        try {
            return await getUnansweredQuestions(userId, module);
        } catch (error: any) {
            console.error(`Error in getUnansweredQuestionsTool for module ${module}:`, error);
            return { error: `Failed to get unanswered questions for ${module}: ${error.message}` };
        }
    }
});

export const createSaveMonologueTextResponseTool = (userId: string) => tool({
    description: "Saves a user's text-based response to the last monologue question they were asked. The tool automatically identifies the correct question.",
    parameters: z.object({
        textResponse: z.string().describe("The user's complete, text-based answer to the monologue question."),
    }),
    execute: async ({ textResponse }) => {
        try {
            const unansweredResult = await getUnansweredQuestions(userId, 'monologue');
            if (unansweredResult.error || !unansweredResult.unansweredQuestions || unansweredResult.unansweredQuestions.length === 0) {
                 return { success: false, error: 'Could not determine which question to save the answer for. No unanswered questions found.' };
            }

            const questionToAnswer = unansweredResult.unansweredQuestions[0];
            const questionId = questionToAnswer.id;
            const questionText = questionToAnswer.text;
            
            const existingRecording = await prisma.monologueRecording.findFirst({
                where: { userId, questionId },
            });

            if (existingRecording) {
                await prisma.monologueRecording.update({
                    where: { id: existingRecording.id },
                    data: { textResponse },
                });
            } else {
                await prisma.monologueRecording.create({
                    data: {
                        userId,
                        questionId,
                        questionText: questionText,
                        textResponse,
                        audioPath: null, 
                    },
                });
            }
            
            return { success: true, message: 'Response saved successfully.' };
        } catch (error: any) {
            console.error(`Error saving monologue text response for user ${userId}:`, error);
            return { success: false, error: `An unexpected error occurred: ${error.message}` };
        }
    }
}); 