import { createOpenAI } from '@ai-sdk/openai';
import { generateText, type CoreMessage } from 'ai';
import {
    createDatabaseQueryTool,
    createAddPortfolioLinkTool,
    createGetUnansweredQuestionsTool,
    createGetOverallProgressTool,
    createGetMonologueProgressTool,
    createFinalizeFileUploadTool,
    createGetNextQuestionTool,
    createSaveMonologueTextResponseTool
} from '~/server/utils/ai-tools';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~/server/utils/prisma';

export default defineEventHandler(async (event) => {
    try {
        const user = await serverSupabaseUser(event);
        if (!user) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
        }

        // Get user profile for personalization
        const userProfile = await prisma.userProfile.findUnique({
            where: { id: user.id },
            select: { name: true }
        });
        const userName = userProfile?.name || 'Artist';

        let { messages }: { messages: CoreMessage[] } = await readBody(event);

        // Save the user's message
        const userMessage = messages.findLast(m => m.role === 'user');
        if (userMessage && userMessage.content) {
             await prisma.chatMessage.create({
                data: {
                    userId: user.id,
                    role: 'user',
                    content: typeof userMessage.content === 'string' ? userMessage.content : JSON.stringify(userMessage.content),
                }
            });
        }

        const openai = createOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            system: `
            
            You are the proactive, conversational training partner of the Artx training platform. 
            Artˣ is building the first foundation model for creativity - powered by the largest proprietary dataset created by the world's most renowned artists and creatives. For this, they get access to this platform, which you are gatekeeping. 
            They will have to share their personality and the way they think, currently by sharing their creative portfolio in forms of links, files and describing them extensively. 
            Then, they will answer specific questions ("monolouges") that you are aware of. Right now it's 100 questions that need to be answered extensively.
            Your goal is to proactively guide the user (likely an artist, composer, director or other creative) through the training steps one question at a time and record their answers.

            **User Information:**
            The user you're speaking with is named: ${userName}
            Always address them by their name when appropriate to create a personal connection.

            **Core Directives:**
            1.  **Focus on the Current Question**: If you've asked a question, your primary goal is to get a meaningful response. If the user gives a short or vague answer, gently guide them back and try to get more information. Always accept though if users don't want to share more and be aware they are artists so their answers don't always have to make sense to you.
            2.  **Save Monologue Answers**: When the user provides a substantial text answer to a monologue question, you MUST use the \`saveMonologueTextResponseTool\` to save it. The tool will automatically save the answer for the most recent question you asked.
            3.  **Save any Link or File into the Portfolio**: When users provide files or links,  you MUST use the \`createAddPortfolioLinkTool\` to save it. You should always ask for a rather extensive description and user thoughts about the uploaded file or link.
            4.  **Always Move Forward**: After a question is answered (and saved, if applicable), immediately use the \`getNextQuestion\` tool to ask the next one. This is your default action.
            5.  **No Progress Summaries**: Do not give a summary of progress unless the user explicitly asks for it. Avoid using the 'getOverallProgress' tool.
            6.  **Handle Files**: If a user uploads a file, ask for context and then use the \`finalizeFileUpload\` tool.
            7.  **No Tool or Internal Description Talk**: Make your conversation with the user as natural as possible. Never mention the names of your tools. Avoid sayinog monolouge or portfolio too often. Think about fitting alternatives for more natural conversation. Interact like an engaged human with a clear goal in mind.
            8.  **Response Formatting**: When asking a new question do not add markdown.
            `,
            messages,
            tools: {
                saveMonologueTextResponse: createSaveMonologueTextResponseTool(user.id),
                getNextQuestion: createGetNextQuestionTool(user.id),
                queryDatabase: createDatabaseQueryTool(user.id),
                getOverallProgress: createGetOverallProgressTool(user.id),
                getUnansweredQuestions: createGetUnansweredQuestionsTool(user.id),
                getMonologueProgress: createGetMonologueProgressTool(user.id),
                addPortfolioLink: createAddPortfolioLinkTool(user.id),
                finalizeFileUpload: createFinalizeFileUploadTool(user.id, event),
            },
            maxSteps: 10,
        });

        // Save the assistant's response
        await prisma.chatMessage.create({
            data: {
                userId: user.id,
                role: 'assistant',
                content: text,
            }
        });

        return { content: text };
    } catch (e: any) {
        console.error(e);
        throw createError({
            statusCode: 500,
            statusMessage: e.message
        });
    }
}); 