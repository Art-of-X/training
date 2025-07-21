import { createOpenAI } from '@ai-sdk/openai';
import { generateText, type CoreMessage } from 'ai';
import {
    createDatabaseQueryTool,
    createGetPortfolioProgressTool,
    createFinalizeFileUploadTool,

    createDocumentProcessingTool,
    createAnalyzeLinkTool,
    createQueryChatSessionsTool,
    createCheckUserContextTool,
    createWebSearchTool,
    createGetPortfolioItemDetailsTool,
    createGenerateThoughtProvokingQuestionTool,
    createGetPredefinedQuestionTool,
    // Removed language detection tools
    // createDetectAndSetLanguageTool,
    // createGetLanguagePreferenceTool,
} from '~/server/utils/ai-tools';
import { prisma } from '~/server/utils/prisma';
import { fetchPromptsFromPublicSheet } from './fetchPromptsFromPublicSheet';
// Removed: import { GoogleGenerativeAI } from '@google/generative-ai';
// Removed: import { AIMessage, HumanMessage } from '@langchain/core/messages';
// Removed: import { ChatOpenAI } from '@langchain/openai';

interface GenerateTitleParams {
  messages: { role: string; content: string }[];
  userProfileName: string;
}

export const generateChatSessionTitle = async ({ messages, userProfileName }: GenerateTitleParams): Promise<string> => {
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const conversationHistory = messages.map(msg => 
    msg.role === 'user' ? `User: ${msg.content}` : `AI: ${msg.content}`
  ).join('\n');

  const prompt = `Given the following conversation between ${userProfileName} and an AI, generate an extensive title that summarizes the conversation. The title should be in plain text, without quotes or special characters. 

Conversation:
${conversationHistory}

Title:`;

  try {
    const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: prompt,
        temperature: 0.3, // Lower temperature for more consistent titles
    });
    const title = text.trim().replace(/["'\]]/g, '').replace(/\.$/, ''); // Clean up quotes and trailing dot
    return title || "Untitled Chat";
  } catch (error) {
    console.error('Error generating chat session title:', error);
    return "Untitled Chat";
  }
};

export async function generateAICoreResponse(
    userId: string,
    userName: string,
    messages: CoreMessage[],
    supabaseUrl: string
) {
    const prompts = await fetchPromptsFromPublicSheet();
    const systemPrompt = prompts['systemPrompt'];
    const developerPrompt = prompts['developerPrompt'];
    const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const { text, toolCalls, finishReason, usage } = await generateText({
        model: openai('gpt-4o-mini'),
        system: `${systemPrompt}\n${developerPrompt}`,
        messages,
        tools: {
            webSearch: createWebSearchTool(),

            documentProcessing: createDocumentProcessingTool(userId),
            queryChatSessions: createQueryChatSessionsTool(userId),
            getPortfolioItemDetails: createGetPortfolioItemDetailsTool(userId),
            generateThoughtProvokingQuestion: createGenerateThoughtProvokingQuestionTool(userId),
            queryDatabase: createDatabaseQueryTool(userId),
            getPortfolioProgress: createGetPortfolioProgressTool(userId),
            finalizeFileUpload: createFinalizeFileUploadTool(userId, supabaseUrl),
            analyzeLink: createAnalyzeLinkTool(userId),
            checkUserContext: createCheckUserContextTool(userId),
            getPredefinedQuestion: createGetPredefinedQuestionTool(userId),

        },
        maxSteps: 10,
    });

    return { text, toolCalls, finishReason, usage };
} 