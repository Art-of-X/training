import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { serverSupabaseClient } from '#supabase/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, type CoreMessage } from 'ai';
import { PDFExtract, type PDFExtractOptions, type PDFExtractResult } from 'pdf.js-extract';

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
    'ChatSession',
    'ChatMessage',
]);

// Helper function to generate a schema description string for the AI.
function getModelSchemas() {
    const models = (Prisma as any).dmmf.datamodel.models.filter((model: any) => allowedModels.options.includes(model.name as any));
    
    return models.map((model: any) => {
        const fieldDescriptions = model.fields.map((field: any) => {
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
    description: `Use this tool to query the application's database to find the answer to a user's question. You MUST specify the data model to query. All queries are automatically filtered by the current user's ID.\n\n**IMPORTANT**: To check progress or get counts, use the 'count' queryType instead of 'findMany' to be more efficient. For example, to count portfolio items, use { model: 'PortfolioItem', queryType: 'count' }.\n\nAvailable models and their schemas:\n---\n${modelSchemaString}\n---\n`,
    parameters: z.object({
        model: allowedModels,
        queryType: z.enum([
    'findMany', 
    'count', 
    'findFirst',
    'groupBy'
]).describe("The type of query to run: 'findMany' to get a list of records, 'count' to get a number of records, 'findFirst' to get a single record, or 'groupBy' to group records."),
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
            const modelInfo = (Prisma as any).dmmf.datamodel.models.find((m: any) => m.name === model);
            if (modelInfo) {
                const relationFields = new Set(modelInfo.fields.filter((f: any) => f.kind === 'object').map((f: any) => f.name));
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

export const createWebSearchTool = () => tool({
    description: 'Crucial for personalizing conversations. Before starting a deep conversation, especially with new users or those with sparse portfolios, use this tool to search for the artist\'s name. You MUST use the specific findings (e.g., project names, visual styles, interview quotes) to ask direct, personal questions. For example: "I saw your \'Nocturnal Animals\' series on Behance. Could you tell me about your process for that specific project?"',
    parameters: z.object({
        query: z.string().describe('The search query. Should be the user\'s name to find their professional presence.'),
    }),
    execute: async ({ query }) => {
        try {
            const apiKey = process.env.BRAVE_API_KEY;
            if (!apiKey) {
                return { success: false, error: 'Brave Search API key is not configured.' };
            }
            const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Subscription-Token': apiKey,
                },
            });

            if (!response.ok) {
                return { success: false, error: `Brave Search API request failed with status ${response.status}` };
            }

            const data = await response.json();
            
            if (!data.web || !data.web.results) {
                return { success: true, results: "No results found." };
            }

            const searchResults = data.web.results.slice(0, 5).map((result: any) => ({
                title: result.title,
                url: result.url,
                snippet: result.description,
            }));

            return { success: true, results: searchResults };

        } catch (error: any) {
            console.error('Error in web search tool:', error);
            return { success: false, error: `Failed to perform web search: ${error.message}` };
        }
    }
});

export const createGetPortfolioProgressTool = (userId: string) => tool({
    description: 'Get the user\'s portfolio progress and understand their body of work.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const portfolioItems = await prisma.portfolioItem.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    description: true,
                    link: true,
                    filePath: true,
                    createdAt: true,
                }
            });
            
            return {
                totalItems: portfolioItems.length,
                items: portfolioItems,
                hasWork: portfolioItems.length > 0,
                recentWork: portfolioItems.slice(0, 3)
            };
        } catch (error) {
            console.error('Error in getPortfolioProgressTool:', error);
            return { error: 'Failed to get portfolio progress.' };
        }
    }
});

export const createFinalizeFileUploadTool = (userId: string, event: any) => tool({
    description: "Once the user has provided a temporary file URL and all necessary context (like a description), use this tool to finalize the upload. This moves the file to its permanent location and saves the metadata to the database as a portfolio item.",
    parameters: z.object({
        tempUrl: z.string().url().describe("The temporary URL of the file provided by the user."),
        description: z.string().describe("The user-provided description for the file."),
    }).transform((data) => {
        // Fix malformed JSON keys that might have trailing colons
        const cleanedData: any = {};
        Object.keys(data).forEach(key => {
            const cleanKey = key.replace(/:$/, ''); // Remove trailing colon
            cleanedData[cleanKey] = data[key as keyof typeof data];
        });
        return cleanedData;
    }),
    execute: async ({ tempUrl, description }) => {
        try {
            const supabase = await serverSupabaseClient(event);
            const bucketName = 'uploads';

            // 1. Parse the temp path from the URL
            const urlParts = tempUrl.split('/');
            const tempPath = urlParts.slice(urlParts.indexOf(bucketName) + 1).join('/');

            if (!tempPath.startsWith('temp/')) {
                return { success: false, error: 'Invalid temporary URL provided.' };
            }

            // 2. Determine the new path for portfolio
            const fileName = tempPath.split('/').pop();
            const newPath = `portfolio/${userId}/${fileName}`;

            // 3. Copy the file to the new location
            const { error: copyError } = await supabase.storage.from(bucketName).copy(tempPath, newPath);
            if (copyError) {
                console.error('Error copying file:', copyError);
                return { success: false, error: `Failed to move file: ${copyError.message}` };
            }
            const { data: { publicUrl: newPublicUrl } } = supabase.storage.from(bucketName).getPublicUrl(newPath);

            // 4. Create the portfolio item
            await prisma.portfolioItem.create({
                data: {
                    userId,
                    description,
                    filePath: newPublicUrl,
                },
            });

            // 5. Delete the temporary file
            const { error: deleteError } = await supabase.storage.from(bucketName).remove([tempPath]);
            if (deleteError) {
                console.error('Failed to delete temporary file:', deleteError);
            }

            return { success: true, message: `File successfully saved to portfolio.` };
        } catch (error: any) {
            console.error(`Error finalizing file upload for user ${userId}:`, error);
            return { success: false, error: `An unexpected error occurred: ${error.message}` };
        }
    }
});

export const createQueryChatSessionsTool = (userId: string) => tool({
    description: 'Query chat sessions to understand previous conversations and build on them. Use this to find specific discussions about topics, techniques, or projects mentioned by the user.',
    parameters: z.object({
        query: z.string().describe('Search query to find relevant chat sessions. Can be a topic, technique, project name, or general theme.'),
        limit: z.number().optional().describe('Maximum number of sessions to return. Default is 5.'),
    }),
    execute: async ({ query, limit = 5 }) => {
        try {
            const searchTerm = query.toLowerCase();
            
            // Search in chat session titles and messages
            const sessions = await prisma.chatSession.findMany({
                where: { 
                    userId,
                    OR: [
                        { title: { contains: searchTerm, mode: 'insensitive' } },
                    ]
                },
                include: {
                    chatMessages: {
                        orderBy: { createdAt: 'asc' },
                        take: 10, // Limit messages per session
                        select: { role: true, content: true, createdAt: true }
                    }
                },
                orderBy: { updatedAt: 'desc' },
                take: limit
            });
            
            return {
                success: true,
                sessions: sessions.map(session => ({
                    id: session.id,
                    title: session.title,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt,
                    messageCount: session.chatMessages?.length || 0,
                    relevantMessages: session.chatMessages || []
                }))
            };
        } catch (error: any) {
            console.error('Error in queryChatSessionsTool:', error);
            return { success: false, error: `Failed to query chat sessions: ${error.message}` };
        }
    }
});

export const createGetPortfolioItemDetailsTool = (userId: string) => tool({
    description: 'Get detailed information about a specific portfolio item to ask targeted questions about the work.',
    parameters: z.object({
        portfolioItemId: z.string().describe('The ID of the portfolio item to examine.'),
    }),
    execute: async ({ portfolioItemId }) => {
        try {
            const item = await prisma.portfolioItem.findFirst({
                where: { 
                    id: portfolioItemId,
                    userId 
                },
                select: {
                    id: true,
                    description: true,
                    link: true,
                    filePath: true,
                    createdAt: true,
                }
            });
            
            if (!item) {
                return { success: false, error: 'Portfolio item not found.' };
            }
            
            return {
                success: true,
                item
            };
        } catch (error: any) {
            console.error('Error in getPortfolioItemDetailsTool:', error);
            return { success: false, error: `Failed to get portfolio item details: ${error.message}` };
        }
    }
});

export const createGenerateThoughtProvokingQuestionTool = (userId: string) => tool({
    description: 'Generate a specific, thought-provoking question based on the user\'s work, portfolio items, or previous conversations. The question should be deeply analytical and encourage reflection on their creative process, techniques, or artistic decisions.',
    parameters: z.object({
        context: z.string().describe('The context for the question - could be a portfolio item, technique, style, or topic from conversation.'),
        focus: z.enum(['technique', 'process', 'inspiration', 'decision', 'evolution', 'philosophy']).describe('The focus area for the question.'),
        specificWork: z.string().optional().describe('Specific work or project to focus on, if applicable.'),
    }),
    execute: async ({ context, focus, specificWork }) => {
        try {
            const openai = createOpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const { text } = await generateText({
                model: openai('gpt-4o-mini'),
                prompt: `You are an expert art critic and mentor. Based on the following context, generate one thought-provoking question for the user. Context: ${context}. Focus: ${focus}. Specific Work: ${specificWork || 'N/A'}.`,
            });

            return { success: true, question: text };
        } catch (error: any) {
            console.error('Error in generateThoughtProvokingQuestionTool:', error);
            return { success: false, error: `Failed to generate question: ${error.message}` };
        }
    }
});

export const createAnalyzeLinkTool = (userId: string) => tool({
    description: 'Analyze a web link to extract its main content, identify the type of content (e.g., article, portfolio), and generate a summary and insights. Use this to understand external resources shared by the user.',
    parameters: z.object({
        url: z.string().url().describe('The URL of the link to analyze.'),
    }),
    execute: async ({ url }) => {
        try {
            // Use a web scraping service or library to fetch the content
            // For this example, we'll use a placeholder for the scraping logic
            const response = await fetch(url);
            const html = await response.text();
            
            // Basic content extraction (in a real app, use a library like Cheerio or JSDOM)
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1] : 'No title found';
            
            const openai = createOpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const { text: analysis } = await generateText({
                model: openai('gpt-4o-mini'),
                prompt: `Analyze the following web page content and provide a summary. URL: ${url}. Title: ${title}. Content: ${html.substring(0, 4000)}`,
            });

            return { success: true, analysis };
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

export const createCheckUserContextTool = (userId: string) => tool({
    description: 'Check the user\'s internal context on our platform: portfolio, recent conversations, etc. This is the **first step** in any interaction. Based on the output, decide if you need to perform external research using the `webSearch` tool before asking a question.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const userProfile = await prisma.userProfile.findUnique({
                where: { id: userId },
                select: { name: true, createdAt: true }
            });
            
            // Get portfolio progress
            const portfolioItems = await prisma.portfolioItem.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: { id: true, description: true, link: true, filePath: true, createdAt: true }
            });
            
            // Get recent chat sessions
            const recentSessions = await prisma.chatSession.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                select: { id: true, title: true, updatedAt: true }
            });
            
            // Get recent chat messages to understand context
            const recentMessages = await prisma.chatMessage.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { role: true, content: true, createdAt: true }
            });
            
            // Check if we're in the middle of a question flow
            const lastAssistantMessage = recentMessages.find(m => m.role === 'assistant');
            const lastUserMessage = recentMessages.find(m => m.role === 'user');
            // Check if the assistant has asked a question in their last message
            const hasAskedQuestion = lastAssistantMessage ? 
                (Array.isArray(lastAssistantMessage.content) 
                    ? lastAssistantMessage.content.some((part: any) => 
                        part?.type === 'text' && part?.text?.includes('?')
                      )
                    : String(lastAssistantMessage.content).includes('?')
                ) : false;
            const userHasResponded = lastUserMessage && lastAssistantMessage ? lastUserMessage.createdAt > lastAssistantMessage.createdAt : false;

            return {
                success: true,
                userProfile,
                portfolio: {
                    totalItems: portfolioItems.length,
                    items: portfolioItems,
                    hasWork: portfolioItems.length > 0,
                    recentWork: portfolioItems.slice(0, 3)
                },
                recentSessions,
                recentMessages: recentMessages.map(m => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
                hasAskedQuestion,
                userHasResponded,
                // Removed language fields
                // language: {
                //     preferredLanguage: 'en', // Will be updated after migration
                //     needsLanguageDetection: true
                // },
                context: {
                    isNewUser: portfolioItems.length === 0 && recentSessions.length === 0,
                    needsMorePortfolioItems: portfolioItems.length < 3,
                    hasEstablishedWork: portfolioItems.length >= 3,
                    hasConversationHistory: recentSessions.length > 0
                }
            };
        } catch (error: any) {
            console.error('Error in checkUserContextTool:', error);
            return { success: false, error: `Failed to check user context: ${error.message}` };
        }
    }
}); 

export const createIntelligentDataTool = (userId: string) => tool({
    description: "Intelligent data management tool. Describe what you want to do in natural language and provide context. The tool will intelligently determine the appropriate action and execute it. Use this for saving portfolio items, managing work descriptions, and any other data operations.",
    parameters: z.object({
        action: z.string().describe("What you want to do in natural language (e.g., 'save portfolio item', 'add work description', 'update portfolio item')"),
        context: z.string().describe("Current conversation context and what led to this action"),
        data: z.object({
            portfolioDescription: z.string().optional().describe("Portfolio item description"),
            portfolioLink: z.string().url().optional().describe("Portfolio item link"),
            workDetails: z.string().optional().describe("Detailed information about the work"),
            technique: z.string().optional().describe("Technique or method used"),
            inspiration: z.string().optional().describe("Inspiration or concept behind the work"),
        }).describe("Relevant data for the action"),
    }).transform((data) => {
        // Fix malformed JSON keys that might have trailing colons
        const cleanedData: any = {};
        Object.keys(data).forEach(key => {
            const cleanKey = key.replace(/:$/, ''); // Remove trailing colon
            cleanedData[cleanKey] = data[key as keyof typeof data];
        });
        return cleanedData;
    }),
    execute: async ({ action, context, data }) => {
        try {
            // Handle portfolio items
            if (data.portfolioDescription || data.portfolioLink) {
                const newItem = await prisma.portfolioItem.create({
                    data: {
                        userId,
                        description: data.portfolioDescription || 'Portfolio item',
                        link: data.portfolioLink || null,
                    }
                });
                
                return {
                    success: true,
                    action: 'portfolio_added',
                    message: `Added to portfolio: "${data.portfolioDescription}"`, // Assuming description is always present if this path is taken
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
    description: "Process and understand uploaded documents using AI analysis. Supports PDFs (basic analysis), images (vision analysis), and text documents (TXT, DOC, DOCX, RTF, MD, JSON, XML, CSV). Extract text, understand content, and provide insights about the document. Use this when users upload files to understand what they contain.",
    parameters: z.object({
        fileUrl: z.string().url().describe("The URL of the uploaded file to process"),
        context: z.string().describe("Context about why this file is being processed (e.g., 'user uploaded portfolio work')"),
    }).transform((data) => {
        // Fix malformed JSON keys that might have trailing colons
        const cleanedData: any = {};
        Object.keys(data).forEach(key => {
            const cleanKey = key.replace(/:$/, ''); // Remove trailing colon
            cleanedData[cleanKey] = data[key as keyof typeof data];
        });
        return cleanedData;
    }),
    execute: async ({ fileUrl, context }) => {
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
            
            Please provide:
            1. **Document Type**: What type of document is this?
            2. **Main Content**: What is the primary information or message?
            3. **Key Details**: What specific data, numbers, or important points are mentioned?
            4. **Relevance**: How does this relate to the user's creative work or portfolio?
            5. **Insights**: What insights can we draw about the user's creative process, style, or approach?
            
            Be specific and detailed in your analysis. If this is creative work, describe the visual elements, techniques, and artistic choices.
            `;
            
            // Handle different file types appropriately
            let documentAnalysis: string;
            
            if (fileExtension === 'pdf') {
                const pdfExtract = new PDFExtract();
                const options: PDFExtractOptions = { normalizeWhitespace: true };

                try {
                    const data = await pdfExtract.extractBuffer(Buffer.from(fileBuffer), options);
                    let extractedText = '';
                    for (const page of data.pages) {
                        for (const item of page.content) {
                            if ('str' in item) {
                                extractedText += item.str + ' ';
                            }
                        }
                        extractedText += '\n\n'; // Add page break
                    }
                    
                    // Use OpenAI to summarize or analyze the extracted text if it's too long
                    const { text: analysis } = await generateText({
                        model: openai('gpt-4o-mini'),
                        messages: [
                            {
                                role: 'user',
                                content: `${visionPrompt}\n\nExtracted PDF Content:\n${extractedText.substring(0, 8000)}` // Limit length for prompt
                            }
                        ],
                        maxTokens: 1000,
                    });
                    documentAnalysis = analysis;

                } catch (pdfError: any) {
                    console.error('Error extracting text from PDF:', pdfError);
                    // Fallback to generic PDF analysis if extraction fails
                    documentAnalysis = `
Document Type: PDF file
Main Content: PDF document uploaded by user
Key Details: File size: ${(fileBuffer.byteLength / 1024).toFixed(2)} KB. Text extraction failed: ${pdfError.message}
Relevance: This appears to be a PDF document that may contain creative work, documentation, or portfolio materials
Insights: The user has uploaded a PDF file which could contain design work, documentation, or other creative content. 

Note: This PDF has been uploaded and is available for reference. Since PDF text extraction encountered an error, you should ask the user specific questions about the content, such as:
- What type of document is this?
- What is the main topic or purpose of this PDF?
- How does this relate to their creative work or portfolio?
- What specific details would they like to share about the content?
- What creative insights or feedback would they like about this document?
                    `;
                }
            } else if (['doc', 'docx', 'txt', 'rtf', 'md', 'json', 'xml', 'csv'].includes(fileExtension || '')) {
                // For text-based documents, try to extract text and analyze
                try {
                    const textContent = new TextDecoder().decode(fileBuffer);
                    const { text: analysis } = await generateText({
                        model: openai('gpt-4o-mini'),
                        messages: [
                            {
                                role: 'user',
                                content: `${visionPrompt}\n\nDocument Content:\n${textContent.substring(0, 8000)}`
                            }
                        ],
                        maxTokens: 1000,
                    });
                    documentAnalysis = analysis;
                } catch (e: any) {
                    console.error('Error decoding text document:', e);
                    documentAnalysis = `
Document Type: Text document
Main Content: Text document uploaded by user
Key Details: File size: ${(fileBuffer.byteLength / 1024).toFixed(2)} KB. Decoding failed: ${e.message}
Relevance: This appears to be a text document that may contain creative work, documentation, or other materials
Insights: The user has uploaded a text file that could contain various information relevant to their creative process.
                    `;
                }
            } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')) {
                // For images, use vision directly
                const base64Image = Buffer.from(fileBuffer).toString('base64');
                const imageUrl = `data:${mimeType};base64,${base64Image}`;

                const { text: analysis } = await generateText({
                    model: openai('gpt-4o-mini'),
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: visionPrompt },
                                { type: 'image', image: imageUrl }
                            ]
                        }
                    ],
                    maxTokens: 1000,
                });
                documentAnalysis = analysis;
            } else {
                // For unsupported file types or general binary files
                documentAnalysis = `
Document Type: Unknown/Unsupported File Type
Main Content: Binary file uploaded by user
Key Details: File size: ${(fileBuffer.byteLength / 1024).toFixed(2)} KB. File extension: ${fileExtension || 'none'}
Relevance: The user has uploaded a file of an unknown type. It might be related to their creative work or portfolio.
Insights: Since the file type is not supported for direct analysis, you should ask the user to describe its content and relevance to their creative work.
                `;
            }
            
            const result = {
                success: true,
                documentAnalysis,
                fileType: mimeType,
                fileSize: fileBuffer.byteLength,
                context,
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
            
            return result;
        } catch (error: any) {
            console.error(`Error processing document for user ${userId}:`, error);
            return { success: false, error: `Failed to process document: ${error.message}` };
        }
    }
}); 

// Removed language detection tools
// export const createDetectAndSetLanguageTool = (userId: string) => tool({
//     description: 'Detect the language of user messages and update their language preferences. Use this to ensure the conversation continues in the user\'s preferred language.',
//     parameters: z.object({
//         detectedLanguage: z.string().describe('The detected language code (e.g., "en", "de", "fr", "es")'),
//         confidence: z.number().optional().describe('Confidence level of language detection (0-1)'),
//     }),
//     execute: async ({ detectedLanguage, confidence = 0.8 }) => {
//         try {
//             // Only update if confidence is high enough
//             if (confidence < 0.7) {
//                 return { 
//                     success: false, 
//                     message: 'Language detection confidence too low to update preferences',
//                     detectedLanguage,
//                     confidence 
//                 };
//             }

//             // Update or create user preferences
//             await prisma.userPreferences.upsert({
//                 where: { userId },
//                 update: { 
//                     preferredLanguage: detectedLanguage,
//                     updatedAt: new Date()
//                 },
//                 create: {
//                     userId,
//                     preferredLanguage: detectedLanguage,
//                     ttsEnabled: true
//                 }
//             });

//             return { 
//                 success: true, 
//                 message: `Language preference updated to ${detectedLanguage}`,
//                 detectedLanguage,
//                 confidence
//             };
//         } catch (error: any) {
//             console.error('Error in detectAndSetLanguageTool:', error);
//             return { success: false, error: `Failed to update language preference: ${error.message}` };
//         }
//     }
// });

// export const createGetLanguagePreferenceTool = (userId: string) => tool({
//     description: 'Get the user\'s preferred language for conversations. Use this to ensure you respond in the correct language.',
//     parameters: z.object({}),
//     execute: async () => {
//         try {
//             const preferences = await prisma.userPreferences.findUnique({
//                 where: { userId },
//                 select: { preferredLanguage: true }
//             });
            
//             return {
//                 success: true,
//                 preferredLanguage: preferences?.preferredLanguage || 'en',
//                 hasLanguagePreference: !!preferences?.preferredLanguage
//             };
//         } catch (error: any) {
//             console.error('Error in getLanguagePreferenceTool:', error);
//             return { success: false, error: `Failed to get language preference: ${error.message}` };
//         }
//     }
// }); 

export const createGetPredefinedQuestionTool = (userId: string) => tool({
    description: 'Fetch a predefined question from a JSON file to diversify the conversation or prompt new discussions. Use this tool when the conversation is slowing down, or you need to introduce a new angle to explore the user\'s creative process or general artistic philosophy. Always follow up with a natural question based on the retrieved prompt.',
    parameters: z.object({
        category: z.string().optional().describe('Optional: A category to filter predefined questions by. If not provided, a random question from the general pool will be returned.'),
    }),
    execute: async ({ category }) => {
        try {
            const questions = await readJsonData('general-questions.json');
            
            let filteredQuestions = questions;
            if (category) {
                filteredQuestions = questions.filter((q: any) => q.category && q.category.toLowerCase() === category.toLowerCase());
            }

            if (filteredQuestions.length === 0) {
                return { success: false, error: 'No questions found for the given category or no questions available.' };
            }

            const randomQuestion = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
            
            return { success: true, question: randomQuestion.question, category: randomQuestion.category || "general" };
        } catch (error: any) {
            console.error('Error in getPredefinedQuestionTool:', error);
            return { success: false, error: `Failed to fetch predefined question: ${error.message}` };
        }
    }
}); 