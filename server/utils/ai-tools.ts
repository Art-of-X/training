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
    description: `Use this tool to query the application's database to find the answer to a user's question. You MUST specify the data model to query. All queries are automatically filtered by the current user's ID.

**IMPORTANT**: To check progress or get counts, use the 'count' queryType instead of 'findMany' to be more efficient. For example, to count portfolio items, use { model: 'PortfolioItem', queryType: 'count' }.

Available models and their schemas:
---
${modelSchemaString}
---
`,
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

export const createAddPortfolioLinkTool = (userId: string) => tool({
    description: 'Add a new portfolio item using a URL or file. Use this when the user provides a link to their work or uploads a file, along with a description. This captures their historical work and creative output.',
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
                        where: {
                            OR: [
                                { content: { contains: searchTerm, mode: 'insensitive' } },
                            ]
                        },
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
                    messageCount: session.chatMessages.length,
                    relevantMessages: session.chatMessages
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
            
            const prompt = `Generate a single, highly specific and thought-provoking question for an artist based on this context:

Context: ${context}
Focus Area: ${focus}
${specificWork ? `Specific Work: ${specificWork}` : ''}

The question should:
1. Be deeply analytical and require reflection
2. Focus on the artist's creative process, decisions, or thinking
3. Be specific to their work or technique
4. Encourage them to think about WHY they made certain choices
5. Not be superficial or generic
6. Be about 1-2 sentences long

Generate only the question, no additional text:`;

            const { text: question } = await generateText({
                model: openai('gpt-4o'),
                prompt: prompt,
                temperature: 0.7,
                maxTokens: 100,
            });
            
            return {
                success: true,
                question: question.trim(),
                context,
                focus
            };
        } catch (error: any) {
            console.error('Error in generateThoughtProvokingQuestionTool:', error);
            return { success: false, error: `Failed to generate question: ${error.message}` };
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
            const hasAskedQuestion = lastAssistantMessage?.content.includes('?');
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
                language: {
                    preferredLanguage: 'en', // Will be updated after migration
                    needsLanguageDetection: true
                },
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
            fileUrl: z.string().url().optional().describe("File URL if user uploaded something"),
            fileDescription: z.string().optional().describe("Description of uploaded file"),
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
            if (data.portfolioDescription || data.portfolioLink || data.fileUrl) {
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
        console.log('Document processing tool called with:', { fileUrl, context });
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
                // For PDFs, provide comprehensive analysis without text extraction
                // Since PDF text extraction requires licensing, we'll guide the AI to ask questions
                documentAnalysis = `
Document Type: PDF file
Main Content: PDF document uploaded by user
Key Details: File size: ${(fileBuffer.byteLength / 1024).toFixed(2)} KB
Relevance: This appears to be a PDF document that may contain creative work, documentation, or portfolio materials
Insights: The user has uploaded a PDF file which could contain design work, documentation, or other creative content. 

Note: This PDF has been uploaded and is available for reference. Since PDF text extraction is currently unavailable, you should ask the user specific questions about the content, such as:
- What type of document is this?
- What is the main topic or purpose of this PDF?
- How does this relate to their creative work or portfolio?
- What specific details would they like to share about the content?
- What creative insights or feedback would they like about this document?
                `;
            } else if (['doc', 'docx', 'txt', 'rtf', 'md', 'json', 'xml', 'csv'].includes(fileExtension || '')) {
                // For text-based documents, try to extract text and analyze
                try {
                    const textContent = new TextDecoder().decode(fileBuffer);
                    const { text: analysis } = await generateText({
                        model: openai('gpt-4o'),
                        messages: [
                            {
                                role: 'user',
                                content: `${visionPrompt}\n\nDocument Content:\n${textContent.substring(0, 8000)}`
                            }
                        ],
                        maxTokens: 1000,
                    });
                    documentAnalysis = analysis;
                } catch (textError) {
                    console.log('Text document processing failed:', textError);
                    documentAnalysis = `
Document Type: ${fileExtension?.toUpperCase()} text document
Main Content: Text-based document uploaded by user
Key Details: File size: ${(fileBuffer.byteLength / 1024).toFixed(2)} KB
Relevance: This appears to be a text document that may contain creative work, documentation, or portfolio materials
Insights: The user has uploaded a text document which could contain written work, documentation, or other creative content.
                    `;
                }
            } else {
                // For images, use the vision model
                const { text: analysis } = await generateText({
                    model: openai('gpt-4o'),
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text' as const, text: visionPrompt },
                                { type: 'image' as const, image: fileBuffer }
                            ]
                        }
                    ],
                    maxTokens: 1000,
                });
                documentAnalysis = analysis;
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
            
            console.log('Document processing tool result:', result);
            return result;
        } catch (error: any) {
            console.error(`Error processing document for user ${userId}:`, error);
            return { success: false, error: `Failed to process document: ${error.message}` };
        }
    }
}); 

export const createDetectAndSetLanguageTool = (userId: string) => tool({
    description: 'Detect the language of user messages and update their language preferences. Use this to ensure the conversation continues in the user\'s preferred language.',
    parameters: z.object({
        detectedLanguage: z.string().describe('The detected language code (e.g., "en", "de", "fr", "es")'),
        confidence: z.number().optional().describe('Confidence level of language detection (0-1)'),
    }),
    execute: async ({ detectedLanguage, confidence = 0.8 }) => {
        try {
            // Only update if confidence is high enough
            if (confidence < 0.7) {
                return { 
                    success: false, 
                    message: 'Language detection confidence too low to update preferences',
                    detectedLanguage,
                    confidence 
                };
            }

            // Update or create user preferences
            await prisma.userPreferences.upsert({
                where: { userId },
                update: { 
                    preferredLanguage: detectedLanguage,
                    updatedAt: new Date()
                },
                create: {
                    userId,
                    preferredLanguage: detectedLanguage,
                    ttsEnabled: true
                }
            });

            return { 
                success: true, 
                message: `Language preference updated to ${detectedLanguage}`,
                detectedLanguage,
                confidence
            };
        } catch (error: any) {
            console.error('Error in detectAndSetLanguageTool:', error);
            return { success: false, error: `Failed to update language preference: ${error.message}` };
        }
    }
});

export const createGetLanguagePreferenceTool = (userId: string) => tool({
    description: 'Get the user\'s preferred language for conversations. Use this to ensure you respond in the correct language.',
    parameters: z.object({}),
    execute: async () => {
        try {
            const preferences = await prisma.userPreferences.findUnique({
                where: { userId },
                select: { preferredLanguage: true }
            });
            
            return {
                success: true,
                preferredLanguage: preferences?.preferredLanguage || 'en',
                hasLanguagePreference: !!preferences?.preferredLanguage
            };
        } catch (error: any) {
            console.error('Error in getLanguagePreferenceTool:', error);
            return { success: false, error: `Failed to get language preference: ${error.message}` };
        }
    }
}); 