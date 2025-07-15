import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { serverSupabaseClient } from '#supabase/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

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
    // 'AUTAnswer',
    // 'RATAnswer',
    // 'DATSubmission',
    // 'DemographicsAnswer',
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

    // Count total responses (both predefined and custom questions)
    const totalResponses = await prisma.monologueRecording.count({
        where: { userId: userId }
    });
    
    // Count responses to predefined questions
    const predefinedResponses = await prisma.monologueRecording.count({
        where: { 
            userId: userId,
            questionId: { not: null }
        }
    });
    
    return { 
        answered: predefinedResponses,
        total: total,
        totalResponses: totalResponses // includes custom questions
    };
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
    const totalResponses = progress.portfolio.completed + progress.monologue.completed;

    // Initial greeting for first-time users
    if (progress.portfolio.completed === 0 && progress.monologue.completed === 0) {
        return {
            type: 'greeting',
            module: 'Introduction',
            text: `This is the user's first interaction. Start with "Welcome back, ${userName}!" and then generate a warm, encouraging welcome message. Briefly introduce yourself as their AI partner for this creativity training. Explain that you'll be having a natural conversation about their creative work and thinking process. You can ask them to share examples of their work or ask philosophical questions about creativity - whatever feels most natural to start the conversation.`,
        };
    }

    // Get unanswered questions from different modules
    const monologueQuestions = await getUnansweredQuestions(userId, 'monologue');
    const autQuestions = await getUnansweredQuestions(userId, 'aut');
    const ratQuestions = await getUnansweredQuestions(userId, 'rat');
    const demographicsQuestions = await getUnansweredQuestions(userId, 'demographics');

    // Helper function to randomly select from array
    const randomSelect = (array: any[]) => array[Math.floor(Math.random() * array.length)];

    // If they have very few total responses, mix portfolio with easy questions
    if (totalResponses < 3) {
        // Start with some engaging monologue questions
        if (monologueQuestions.unansweredQuestions.length > 0) {
            const easyQuestions = monologueQuestions.unansweredQuestions.filter((q: any) => 
                q.category === 'Creative Philosophy' || q.category === 'Art'
            );
            if (easyQuestions.length > 0) {
                const question = randomSelect(easyQuestions);
                return {
                    type: 'predefined_question',
                    module: 'monologue',
                    questionId: question.id,
                    questionText: question.text,
                    category: question.category,
                    text: `Mix portfolio building with this question: "${question.text}" Feel free to also ask them to share examples of their work.`
                };
            }
        }
    }

    // Prioritize unanswered monologue questions (120 rich questions available)
    if (monologueQuestions.unansweredQuestions.length > 0) {
        const question = randomSelect(monologueQuestions.unansweredQuestions);
        return {
            type: 'predefined_question',
            module: 'monologue',
            questionId: question.id,
            questionText: question.text,
            category: question.category,
            text: `Ask this specific question: "${question.text}"`
        };
    }

    // If no monologue questions left, try creativity tests
    if (autQuestions.unansweredQuestions.length > 0) {
        const question = randomSelect(autQuestions.unansweredQuestions);
        return {
            type: 'predefined_question',
            module: 'aut',
            questionId: question.id,
            questionText: `Think of as many creative and unusual uses as possible for a ${question.object}. List as many different uses as you can think of.`,
            object: question.object,
            text: `Ask this Alternative Uses Task question: "Think of as many creative and unusual uses as possible for a ${question.object}. List as many different uses as you can think of."`
        };
    }

    if (ratQuestions.unansweredQuestions.length > 0) {
        const question = randomSelect(ratQuestions.unansweredQuestions);
        return {
            type: 'predefined_question',
            module: 'rat',
            questionId: question.id,
            questionText: `What word connects these three words: ${question.word1}, ${question.word2}, ${question.word3}?`,
            words: [question.word1, question.word2, question.word3],
            text: `Ask this Remote Associates Test question: "What word connects these three words: ${question.word1}, ${question.word2}, ${question.word3}?"`
        };
    }

    // If no other questions, try demographics
    if (demographicsQuestions.unansweredQuestions.length > 0) {
        const question = randomSelect(demographicsQuestions.unansweredQuestions);
        return {
            type: 'predefined_question',
            module: 'demographics',
            questionKey: question.key,
            questionText: question.question,
            options: question.options,
            text: `Ask this demographic question: "${question.question}"`
        };
    }

    // Fallback - encourage more portfolio items or custom questions
    return {
        type: 'conversational',
        module: 'Mixed',
        text: `You've answered many questions! Continue the engaging conversation with ${userName}. Ask them to share more of their work or create custom questions about their creative process and philosophy.`,
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
      monologueResponseCount,
      answeredAutIds,
      answeredRatIds,
      datSubmissionCount,
      demographicsAnswerCount,
    ] = await Promise.all([
      prisma.portfolioItem.count({ where: { userId: userId } }),
      prisma.monologueRecording.count({ where: { userId: userId } }),
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
        completed: monologueResponseCount,
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
    description: 'Gets the next specific predefined question from our curated database. Returns actual questions from the 120+ monologue questions, AUT/RAT creativity tests, or demographics questions. Use this to get exact questions to ask rather than creating custom ones. If it returns a predefined question, ask it EXACTLY as provided.',
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
    description: 'Add a new portfolio item using a URL or file. Use this when the user provides a link to their work or uploads a file, along with a description. This can be used at any time during the training, even after starting reflection questions.',
    parameters: z.object({
        link: z.string().url().describe('The URL of the portfolio item or uploaded file.'),
        description: z.string().describe('A description of the portfolio item provided by the user.'),
    }),
    execute: async ({ link, description }) => {
        if (!userId) {
            return { success: false, error: 'User is not authenticated.' };
        }
        try {
            // Check if this is a file upload or a regular link
            const isFileUpload = link.includes('supabase') || link.includes('uploads');
            
            const newItem = await prisma.portfolioItem.create({
                data: {
                    userId,
                    link,
                    description,
                    ...(isFileUpload ? { filePath: link } : {}),
                }
            });
            
            // Get updated portfolio count
            const portfolioCount = await prisma.portfolioItem.count({ where: { userId } });
            
            return { 
                success: true, 
                data: newItem,
                portfolioCount,
                message: `Portfolio item added successfully! You now have ${portfolioCount} items in your portfolio.`
            };
        } catch (error: any) {
            console.error(`Error creating portfolio item for user ${userId}:`, error);
            return { success: false, error: `Failed to add portfolio item: ${error.message}` };
        }
    }
});

export const createFinalizeFileUploadTool = (userId: string, event: any) => tool({
    description: "Once the user has provided a temporary file URL and all necessary context (like a description and the target module), use this tool to finalize the upload. This moves the file to its permanent location and saves the metadata to the database.",
    parameters: z.object({
        tempUrl: z.string().url().describe("The temporary URL of the file provided by the user."),
        target: z.enum(['portfolio', 'monologue']).describe("The module this file is for ('portfolio' or 'monologue')."),
        description: z.string().describe("The user-provided description for the file."),
        questionId: z.union([z.number(), z.string().length(0)]).optional().describe("If the target is 'monologue', the ID of the question this file is supplementary to. Leave empty for portfolio uploads."),
    }).transform((data) => {
        // Fix malformed JSON keys that might have trailing colons
        const cleanedData: any = {};
        Object.keys(data).forEach(key => {
            const cleanKey = key.replace(/:$/, ''); // Remove trailing colon
            cleanedData[cleanKey] = data[key as keyof typeof data];
        });
        return cleanedData;
    }),
    execute: async ({ tempUrl, target, description, questionId }) => {
        try {
            const supabase = await serverSupabaseClient(event);
            const bucketName = 'uploads';

            // Convert questionId to number or handle empty string
            const normalizedQuestionId = (questionId === "" || questionId === undefined) ? null : Number(questionId);

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
                 if (!normalizedQuestionId) {
                    return { success: false, error: "A questionId is required for monologue file uploads." };
                }
                newPath = `monologue/${userId}/${normalizedQuestionId}/${fileName}`;
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
            } else if (target === 'monologue' && normalizedQuestionId) {
                // This assumes we are adding a supplementary file to an *existing* recording.
                // A more complex flow would be needed to create the recording and file simultaneously.
                 await prisma.monologueRecording.updateMany({
                    where: { userId, questionId: normalizedQuestionId },
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
    description: `Get specific unanswered predefined questions for a module. Use this to access our curated question database: 120+ monologue questions (Creative Philosophy, Art, Daily Life, Creative Process), 5 AUT creativity tests, 5 RAT word association tests, 12 demographics questions. These are higher priority than custom questions.`,
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

// Legacy tools removed - replaced with intelligent data tool

export const createAddSupplementaryContentTool = (userId: string) => tool({
    description: 'Add supplementary file or link to an existing question response. Use this when a user wants to add additional context (like a file, image, or link) to a question they already answered.',
    parameters: z.object({
        recordingId: z.string().describe('The ID of the recording to add supplementary content to'),
        supplementaryLink: z.string().optional().describe('Optional link provided by user to supplement their answer'),
        supplementaryDescription: z.string().optional().describe('Optional description of the supplementary content'),
        tempFileUrl: z.string().url().optional().describe('Optional temporary file URL if user uploaded a file'),
    }),
    execute: async ({ recordingId, supplementaryLink, supplementaryDescription, tempFileUrl }) => {
        try {
            let finalFileUrl = null;
            
            // If there's a temp file, finalize it
            if (tempFileUrl) {
                // TODO: Implement file moving logic similar to finalizeFileUpload
                // For now, just use the temp URL
                finalFileUrl = tempFileUrl;
            }
            
            // Update the recording with supplementary content
            const updatedRecording = await prisma.monologueRecording.update({
                where: { id: recordingId },
                data: {
                    supplementaryLink: supplementaryLink || null,
                    supplementaryDescription: supplementaryDescription || null,
                    supplementaryFilePath: finalFileUrl || null,
                },
            });
            
            return {
                success: true,
                message: 'Supplementary content added successfully to your response.',
                recordingId: updatedRecording.id
            };
        } catch (error: any) {
            console.error(`Error adding supplementary content for user ${userId}:`, error);
            return { success: false, error: `Failed to add supplementary content: ${error.message}` };
        }
    }
});

export const createAnalyzeLinkTool = (userId: string) => tool({
    description: 'Analyze a link or URL shared by the user to understand what it contains and categorize it. Extracts full content including text, headings, images, and links. Use this when a user shares a link so you can ask relevant follow-up questions about their work based on the actual content.',
    parameters: z.object({
        url: z.string().url().describe('The URL to analyze'),
    }),
    execute: async ({ url }) => {
        try {
            // Fetch the webpage content
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; ArtX-Bot/1.0; +https://artx.ai)',
                },
            });
            
            if (!response.ok) {
                return {
                    success: false,
                    error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
                    url: url
                };
            }
            
            const html = await response.text();
            
            // Extract basic metadata
            const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : '';
            
            const descriptionMatch = html.match(/<meta[^>]*name=["|']description["|'][^>]*content=["|']([^"|']*)["|']/i);
            const description = descriptionMatch ? descriptionMatch[1].trim() : '';
            
            // Extract Open Graph metadata
            const ogTitleMatch = html.match(/<meta[^>]*property=["|']og:title["|'][^>]*content=["|']([^"|']*)["|']/i);
            const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';
            
            const ogDescriptionMatch = html.match(/<meta[^>]*property=["|']og:description["|'][^>]*content=["|']([^"|']*)["|']/i);
            const ogDescription = ogDescriptionMatch ? ogDescriptionMatch[1].trim() : '';
            
            const ogImageMatch = html.match(/<meta[^>]*property=["|']og:image["|'][^>]*content=["|']([^"|']*)["|']/i);
            const ogImage = ogImageMatch ? ogImageMatch[1].trim() : '';
            
            // Extract actual content from the page
            let cleanedContent = '';
            let headings: string[] = [];
            let images: string[] = [];
            let links: string[] = [];
            
            try {
                // Remove script and style tags
                let contentHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                contentHtml = contentHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                
                // Extract headings (h1, h2, h3, etc.)
                const headingMatches = contentHtml.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi);
                if (headingMatches) {
                    headings = headingMatches.map(h => h.replace(/<[^>]*>/g, '').trim()).filter(h => h.length > 0);
                }
                
                // Extract images
                const imgMatches = contentHtml.match(/<img[^>]*src=["|']([^"|']*)["|']/gi);
                if (imgMatches) {
                    images = imgMatches.map(img => {
                        const srcMatch = img.match(/src=["|']([^"|']*)["|']/i);
                        return srcMatch ? srcMatch[1] : '';
                    }).filter(src => src.length > 0).slice(0, 10); // Limit to first 10 images
                }
                
                // Extract text content from body
                const bodyMatch = contentHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                if (bodyMatch) {
                    let bodyContent = bodyMatch[1];
                    // Remove remaining HTML tags
                    bodyContent = bodyContent.replace(/<[^>]*>/g, ' ');
                    // Clean up whitespace
                    bodyContent = bodyContent.replace(/\s+/g, ' ').trim();
                    // Limit content length to avoid overwhelming the AI
                    cleanedContent = bodyContent.substring(0, 2000);
                }
                
                // Extract internal links (for portfolio sites, might show project links)
                const linkMatches = contentHtml.match(/<a[^>]*href=["|']([^"|']*)["|'][^>]*>(.*?)<\/a>/gi);
                if (linkMatches) {
                    links = linkMatches.map(link => {
                        const hrefMatch = link.match(/href=["|']([^"|']*)["|']/i);
                        const textMatch = link.match(/>(.*?)<\/a>/i);
                        const href = hrefMatch ? hrefMatch[1] : '';
                        const text = textMatch ? textMatch[1].replace(/<[^>]*>/g, '').trim() : '';
                        return text && href ? `${text}: ${href}` : '';
                    }).filter(link => link.length > 0).slice(0, 5); // Limit to first 5 links
                }
            } catch (contentError) {
                console.error('Error extracting content:', contentError);
            }
            
            // Determine platform/category based on URL
            const hostname = new URL(url).hostname.toLowerCase();
            let platform = 'website';
            let category = 'general';
            
            if (hostname.includes('instagram.com')) {
                platform = 'instagram';
                category = 'social_media';
            } else if (hostname.includes('behance.net')) {
                platform = 'behance';
                category = 'portfolio';
            } else if (hostname.includes('dribbble.com')) {
                platform = 'dribbble';
                category = 'portfolio';
            } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
                platform = 'youtube';
                category = 'video';
            } else if (hostname.includes('vimeo.com')) {
                platform = 'vimeo';
                category = 'video';
            } else if (hostname.includes('artstation.com')) {
                platform = 'artstation';
                category = 'portfolio';
            } else if (hostname.includes('deviantart.com')) {
                platform = 'deviantart';
                category = 'portfolio';
            } else if (hostname.includes('linkedin.com')) {
                platform = 'linkedin';
                category = 'professional';
            } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
                platform = 'twitter';
                category = 'social_media';
            } else if (hostname.includes('tiktok.com')) {
                platform = 'tiktok';
                category = 'social_media';
            } else if (hostname.includes('pinterest.com')) {
                platform = 'pinterest';
                category = 'visual_inspiration';
            } else if (hostname.includes('github.com')) {
                platform = 'github';
                category = 'code';
            } else if (hostname.includes('medium.com') || hostname.includes('substack.com')) {
                platform = hostname.includes('medium.com') ? 'medium' : 'substack';
                category = 'blog';
            } else {
                // Try to categorize based on content
                const contentLower = html.toLowerCase();
                if (contentLower.includes('portfolio') || contentLower.includes('gallery')) {
                    category = 'portfolio';
                } else if (contentLower.includes('blog') || contentLower.includes('article')) {
                    category = 'blog';
                } else if (contentLower.includes('shop') || contentLower.includes('store')) {
                    category = 'commerce';
                }
            }
            
            const finalTitle = ogTitle || title || 'Untitled';
            const finalDescription = ogDescription || description || 'No description available';
            
            return {
                success: true,
                url: url,
                title: finalTitle,
                description: finalDescription,
                platform: platform,
                category: category,
                ogImage: ogImage || null,
                hostname: hostname,
                content: {
                    text: cleanedContent,
                    headings: headings,
                    images: images,
                    links: links,
                    wordCount: cleanedContent.split(/\s+/).filter(word => word.length > 0).length,
                },
                metadata: {
                    title: title,
                    description: description,
                    ogTitle: ogTitle,
                    ogDescription: ogDescription,
                    ogImage: ogImage,
                }
            };
        } catch (error: any) {
            console.error(`Error analyzing link for user ${userId}:`, error);
            return { 
                success: false, 
                error: `Failed to analyze link: ${error.message}`,
                url: url
            };
        }
    }
});

export const createGetPreviousQuestionsAskedTool = (userId: string) => tool({
    description: 'Get a list of questions you have previously asked this user to avoid repetition and build on previous conversations. Use this to ensure you don\'t ask the same questions twice.',
    parameters: z.object({}),
    execute: async () => {
        try {
            // Get all questions from saved monologue recordings
            const savedQuestions = await prisma.monologueRecording.findMany({
                where: { userId },
                select: { 
                    questionText: true, 
                    textResponse: true, 
                    createdAt: true,
                    questionId: true
                },
                orderBy: { createdAt: 'desc' },
                take: 20 // Last 20 questions to avoid overwhelming
            });
            
            // Get questions from recent chat messages (assistant messages with question marks)
            const recentMessages = await prisma.chatMessage.findMany({
                where: { 
                        userId,
                    role: 'assistant'
                },
                select: { content: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 15
            });
            
            // Extract questions from recent messages
            const chatQuestions = recentMessages
                .filter(msg => msg.content.includes('?'))
                .map(msg => {
                    // Extract sentences with question marks
                    const sentences = msg.content.split(/[.!]/).filter(s => s.includes('?'));
                    return sentences.map(q => q.trim()).filter(q => q.length > 10);
                })
                .flat()
                .slice(0, 10); // Limit to recent questions
            
            return {
                success: true,
                savedQuestions: savedQuestions.map(q => ({
                    question: q.questionText,
                    hasResponse: !!q.textResponse,
                    isCustom: q.questionId === null, // Null questionId means custom question
                    askedAt: q.createdAt
                })),
                recentChatQuestions: chatQuestions,
                totalQuestionsAsked: savedQuestions.length
            };
        } catch (error: any) {
            console.error('Error in getPreviousQuestionsAskedTool:', error);
            return { success: false, error: `Failed to get previous questions: ${error.message}` };
        }
    }
}); 

export const createCheckUserContextTool = (userId: string) => tool({
    description: 'Check the user\'s current context and progress to understand what they should do next. Use this to avoid asking duplicate questions or getting stuck in loops.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const userProfile = await prisma.userProfile.findUnique({
                where: { id: userId },
                select: { name: true, createdAt: true }
            });
            
            const progress = await getOverallProgress(userId);
            
            // Get recent chat messages to understand context
            const recentMessages = await prisma.chatMessage.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 10, // Increased from 5 to 10 for better context
                select: { role: true, content: true, createdAt: true }
            });
            
            // Check if we're in the middle of a question flow
            const lastAssistantMessage = recentMessages.find(m => m.role === 'assistant');
            const hasAskedQuestion = lastAssistantMessage?.content.includes('?');
            
            return {
                success: true,
                userProfile,
                progress,
                recentMessages,
                hasAskedQuestion,
                context: {
                    isNewUser: progress.portfolio.completed === 0 && progress.monologue.completed === 0,
                    needsMorePortfolioItems: progress.portfolio.completed < 3,
                    canStartReflections: progress.portfolio.completed >= 3,
                    inReflectionPhase: progress.monologue.completed > 0,
                    isComplete: progress.monologue.completed >= progress.monologue.total
                }
            };
        } catch (error: any) {
            console.error('Error in checkUserContextTool:', error);
            return { success: false, error: `Failed to check user context: ${error.message}` };
        }
    }
}); 

export const createIntelligentDataTool = (userId: string) => tool({
    description: "Intelligent data management tool. Describe what you want to do in natural language and provide context. The tool will intelligently determine the appropriate action and execute it. Use this for saving responses, updating data, associating files, managing portfolio items, and any other data operations.",
    parameters: z.object({
        action: z.string().describe("What you want to do in natural language (e.g., 'save user response about screen time', 'associate uploaded file with current question', 'update previous answer', 'add portfolio item')"),
        context: z.string().describe("Current conversation context and what led to this action"),
        data: z.object({
            textResponse: z.string().optional().describe("User's text response if applicable"),
            questionText: z.string().optional().describe("Question being answered if applicable"),
            questionId: z.union([z.number(), z.string().length(0)]).optional().describe("Question ID if from predefined questions"),
            fileUrl: z.string().url().optional().describe("File URL if user uploaded something"),
            fileDescription: z.string().optional().describe("Description of uploaded file"),
            recordingId: z.string().optional().describe("Existing recording ID if updating"),
            supplementaryLink: z.string().optional().describe("Supplementary link if provided"),
            supplementaryDescription: z.string().optional().describe("Description of supplementary content"),
            portfolioDescription: z.string().optional().describe("Portfolio item description"),
            portfolioLink: z.string().url().optional().describe("Portfolio item link"),
        }).describe("Relevant data for the action"),
        target: z.enum(['monologue', 'portfolio', 'auto']).optional().describe("Target for the action. Use 'auto' to let the tool decide based on context."),
    }).transform((data) => {
        // Fix malformed JSON keys that might have trailing colons
        const cleanedData: any = {};
        Object.keys(data).forEach(key => {
            const cleanKey = key.replace(/:$/, ''); // Remove trailing colon
            cleanedData[cleanKey] = data[key as keyof typeof data];
        });
        return cleanedData;
    }),
    execute: async ({ action, context, data, target }) => {
        try {
            // Normalize questionId
            const normalizedQuestionId = (data.questionId === "" || data.questionId === undefined) ? null : data.questionId as number;
            const isCustomQuestion = normalizedQuestionId === null;
            
            // Determine target if auto
            let finalTarget = target;
            if (target === 'auto' || !target) {
                if (data.textResponse && data.questionText) {
                    finalTarget = 'monologue';
                } else if (data.fileUrl && data.portfolioDescription) {
                    finalTarget = 'portfolio';
                } else if (data.fileUrl && data.questionText) {
                    finalTarget = 'monologue';
                } else {
                    finalTarget = 'portfolio'; // Default fallback
                }
            }

            // Handle different action types based on context
            if (finalTarget === 'monologue') {
                if (data.recordingId) {
                    // Update existing recording
                    const updatedRecording = await prisma.monologueRecording.update({
                        where: { 
                            id: data.recordingId,
                            userId: userId
                        },
                        data: {
                            textResponse: data.textResponse || undefined,
                            questionText: data.questionText || undefined,
                            questionId: normalizedQuestionId,
                            supplementaryLink: data.supplementaryLink || null,
                            supplementaryDescription: data.supplementaryDescription || null,
                            supplementaryFilePath: data.fileUrl || null,
                        },
                    });
                    
                    return { 
                        success: true, 
                        action: 'updated_monologue',
                        message: `Updated existing response: "${data.questionText}"`,
                        recordingId: updatedRecording.id
                    };
                } else if (data.textResponse && data.questionText) {
                    // Create new monologue recording
                    const newRecording = await prisma.monologueRecording.create({
                        data: {
                            userId,
                            questionId: normalizedQuestionId,
                            questionText: data.questionText,
                            textResponse: data.textResponse,
                            supplementaryLink: data.supplementaryLink || null,
                            supplementaryDescription: data.supplementaryDescription || null,
                            supplementaryFilePath: data.fileUrl || null,
                        },
                    });
                    
                    return { 
                        success: true, 
                        action: 'created_monologue',
                        message: `Saved response to: "${data.questionText}"`,
                        recordingId: newRecording.id,
                        isCustomQuestion
                    };
                } else if (data.fileUrl && data.questionText) {
                    // Associate file with question (create or update)
                    const existingRecording = await prisma.monologueRecording.findFirst({
                        where: { 
                            userId, 
                            questionId: normalizedQuestionId 
                        }
                    });
                    
                    if (existingRecording) {
                        // Update existing recording with file
                        await prisma.monologueRecording.update({
                            where: { id: existingRecording.id },
                            data: {
                                supplementaryFilePath: data.fileUrl,
                                supplementaryDescription: data.fileDescription || data.supplementaryDescription,
                            },
                        });
                        
                        return { 
                            success: true, 
                            action: 'updated_with_file',
                            message: `Associated file with existing question: "${data.questionText}"`,
                            recordingId: existingRecording.id
                        };
                    } else {
                        // Create new recording with file
                        const newRecording = await prisma.monologueRecording.create({
                            data: {
                                userId,
                                questionId: normalizedQuestionId,
                                questionText: data.questionText,
                                textResponse: null,
                                supplementaryFilePath: data.fileUrl,
                                supplementaryDescription: data.fileDescription || data.supplementaryDescription,
                            },
                        });
                        
                        return { 
                            success: true, 
                            action: 'created_with_file',
                            message: `Saved file as supplementary content for: "${data.questionText}"`,
                            recordingId: newRecording.id
                        };
                    }
                }
            } else if (finalTarget === 'portfolio') {
                // Handle portfolio items
                const newItem = await prisma.portfolioItem.create({
                    data: {
                        userId,
                        description: data.portfolioDescription || data.fileDescription || 'Portfolio item',
                        link: data.portfolioLink || null,
                        filePath: data.fileUrl || null,
                    }
                });
                
                return { 
                    success: true, 
                    action: 'portfolio_added',
                    message: `Added to portfolio: "${data.portfolioDescription || data.fileDescription}"`,
                    portfolioItemId: newItem.id
                };
            }
            
            return { success: false, error: 'Could not determine appropriate action based on provided data' };
        } catch (error: any) {
            console.error(`Error in intelligent data tool for user ${userId}:`, error);
            return { success: false, error: `An unexpected error occurred: ${error.message}` };
        }
    }
}); 

export const createDocumentProcessingTool = (userId: string) => tool({
    description: "Process and understand uploaded documents (PDFs, images, etc.) using AI vision. Extract text, understand content, and provide insights about the document. Use this when users upload files to understand what they contain.",
    parameters: z.object({
        fileUrl: z.string().url().describe("The URL of the uploaded file to process"),
        context: z.string().describe("Context about why this file is being processed (e.g., 'user uploaded screen time document')"),
        questionText: z.string().optional().describe("The question this document relates to, if applicable"),
    }).transform((data) => {
        // Fix malformed JSON keys that might have trailing colons
        const cleanedData: any = {};
        Object.keys(data).forEach(key => {
            const cleanKey = key.replace(/:$/, ''); // Remove trailing colon
            cleanedData[cleanKey] = data[key as keyof typeof data];
        });
        return cleanedData;
    }),
    execute: async ({ fileUrl, context, questionText }) => {
        try {
            // Download the file from the URL
            const response = await fetch(fileUrl);
            if (!response.ok) {
                return { success: false, error: `Failed to download file: ${response.statusText}` };
            }
            
            const fileBuffer = await response.arrayBuffer();
            const fileBlob = new Blob([fileBuffer]);
            
            // Determine file type and prepare for OpenAI
            const fileExtension = fileUrl.split('.').pop()?.toLowerCase();
            let mimeType = 'application/octet-stream';
            
            if (fileExtension === 'pdf') {
                mimeType = 'application/pdf';
            } else if (['jpg', 'jpeg'].includes(fileExtension || '')) {
                mimeType = 'image/jpeg';
            } else if (fileExtension === 'png') {
                mimeType = 'image/png';
            } else if (fileExtension === 'gif') {
                mimeType = 'image/gif';
            } else if (fileExtension === 'webp') {
                mimeType = 'image/webp';
            }
            
            // Create file for OpenAI API
            const file = new File([fileBlob], `document.${fileExtension}`, { type: mimeType });
            
            // Use OpenAI's vision model to understand the document
            const openai = createOpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            
            const visionPrompt = `
            Analyze this document and provide a comprehensive understanding of its content.
            
            Context: ${context}
            ${questionText ? `Related Question: ${questionText}` : ''}
            
            Please provide:
            1. **Document Type**: What type of document is this?
            2. **Main Content**: What is the primary information or message?
            3. **Key Details**: What specific data, numbers, or important points are mentioned?
            4. **Relevance**: How does this relate to the user's creative process or the question being discussed?
            5. **Insights**: What insights can we draw about the user's habits, preferences, or creative approach?
            
            Be specific and detailed in your analysis. If this is data (like screen time, to-do lists, etc.), extract the actual numbers and facts.
            `;
            
            const { text: documentAnalysis } = await generateText({
                model: openai('gpt-4o'),
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: visionPrompt },
                            { type: 'image', image: fileBuffer }
                        ]
                    }
                ],
                maxTokens: 1000,
            });
            
            return {
                success: true,
                documentAnalysis,
                fileType: mimeType,
                fileSize: fileBuffer.byteLength,
                context,
                questionText: questionText || null,
                extractedContent: documentAnalysis,
                insights: {
                    documentType: documentAnalysis.includes('Document Type:') ? 
                        documentAnalysis.split('Document Type:')[1]?.split('\n')[0]?.trim() : 'Unknown',
                    mainContent: documentAnalysis.includes('Main Content:') ? 
                        documentAnalysis.split('Main Content:')[1]?.split('\n')[0]?.trim() : 'Not specified',
                    keyDetails: documentAnalysis.includes('Key Details:') ? 
                        documentAnalysis.split('Key Details:')[1]?.split('\n')[0]?.trim() : 'Not specified',
                    relevance: documentAnalysis.includes('Relevance:') ? 
                        documentAnalysis.split('Relevance:')[1]?.split('\n')[0]?.trim() : 'Not specified',
                    insights: documentAnalysis.includes('Insights:') ? 
                        documentAnalysis.split('Insights:')[1]?.split('\n')[0]?.trim() : 'Not specified',
                }
            };
        } catch (error: any) {
            console.error(`Error processing document for user ${userId}:`, error);
            return { success: false, error: `Failed to process document: ${error.message}` };
        }
    }
}); 