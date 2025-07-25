import { createOpenAI } from '@ai-sdk/openai';
import { generateText, type CoreMessage } from 'ai';
import {
    createDatabaseQueryTool, // for database queries
    createFinalizeFileUploadTool, // for file uploads
    createDocumentProcessingTool, // for document processing
    createAnalyzeLinkTool, // for analyzing links
    createQueryChatSessionsTool, // for querying chat sessions
    createWebSearchTool, // for web searching
    createGetPortfolioItemDetailsTool, // for getting portfolio item details
    createGetPredefinedQuestionTool, // for getting predefined questions
    getUserPreferencesTool, // for getting user preferences
    setUserPreferencesTool, // for setting user preferences
} from '~/server/utils/ai-tools';
import { prisma } from '~/server/utils/prisma';
import { fetchPromptsFromPublicSheet } from './fetchPromptsFromPublicSheet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
        temperature: 0.8, // Lower temperature for more consistent titles
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
    let systemPrompt: string;
    let developerPrompt: string;

    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local') {
        // Load prompts from text files in local/dev
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const assetsDir = path.join(__dirname, '..', '..', 'assets');
        systemPrompt = fs.readFileSync(path.join(assetsDir, 'systemPrompt.txt'), 'utf-8');
        developerPrompt = fs.readFileSync(path.join(assetsDir, 'developerPrompt.txt'), 'utf-8');
        // Optionally, interpolate userName if needed
        systemPrompt = systemPrompt.replace(/\{\{userName\}\}/g, userName);
    } else {
        const prompts = await fetchPromptsFromPublicSheet();
        systemPrompt = prompts['systemPrompt'];
        developerPrompt = prompts['developerPrompt'];
    }
    const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // Fetch user preferences (including memory)
    const userPreferences = await getUserPreferencesTool(userId).execute({}, { toolCallId: '', messages: [] });
    let fullSystemPrompt = `${systemPrompt}\n${developerPrompt}`;
    const prefs: any = userPreferences;
    if (prefs && prefs.memory) {
        fullSystemPrompt += `\n\n[User Memory]\n${prefs.memory}`;
    }

    const { text, toolCalls, finishReason, usage } = await generateText({
        model: openai('gpt-4.1-mini'),
        system: fullSystemPrompt,
        messages,
        tools: {
            webSearch: createWebSearchTool(),
            documentProcessing: createDocumentProcessingTool(userId),
            queryChatSessions: createQueryChatSessionsTool(userId),
            getPortfolioItemDetails: createGetPortfolioItemDetailsTool(userId),
            queryDatabase: createDatabaseQueryTool(userId),
            finalizeFileUpload: createFinalizeFileUploadTool(userId, supabaseUrl),
            analyzeLink: createAnalyzeLinkTool(userId),
            getPredefinedQuestion: createGetPredefinedQuestionTool(userId),
            getUserPreferences: getUserPreferencesTool(userId),
            setUserPreferences: setUserPreferencesTool(userId),
        },
        maxSteps: 10,
    });

    return { text, toolCalls, finishReason, usage };
} 