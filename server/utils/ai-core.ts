import { createOpenAI } from '@ai-sdk/openai';
import { generateText, type CoreMessage } from 'ai';
import {
    createDatabaseQueryTool,
    createAddPortfolioLinkTool,
    createGetPortfolioProgressTool,
    createFinalizeFileUploadTool,
    createIntelligentDataTool,
    createDocumentProcessingTool,
    createAnalyzeLinkTool,
    createQueryChatSessionsTool,
    createCheckUserContextTool,
    createWebSearchTool,
    createGetPortfolioItemDetailsTool,
    createGenerateThoughtProvokingQuestionTool,
    createDetectAndSetLanguageTool,
    createGetLanguagePreferenceTool
} from '~/server/utils/ai-tools';
import { prisma } from '~/server/utils/prisma';
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

  const prompt = `Given the following conversation between ${userProfileName} and an AI, generate a concise title (max 5-7 words) that summarizes the conversation. The title should be in plain text, without quotes or special characters. 

Conversation:
${conversationHistory}

Title:`;

  try {
    const { text } = await generateText({
        model: openai('gpt-4o'),
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
    event: any // Adjust this type based on what `event` provides, if needed
) {
    const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are the proactive, conversational training partner of the Artˣ training platform.\nArtˣ is building the first foundation model for creativity and artistic thinking - powered by the largest proprietary dataset created by young promising and upcoming artists and the world's most renowned artists. For this, they get access to this platform, which you are gatekeeping.\nYour goal is to have natural, flowing conversations with artists about their work and a creative thinking process. You are genuinely curious about HOW they think. But to understand that, you are also curious about what they DO. Every detail about their work is interesting, and every response is an opportunity to understand their artistic mind deeper. You can ask ANY questions about their way of thinking, the art they admire or hate, their work, their philosophy, or their creative process. Ask for examples, but only sometimes, not always. The more detailed question-answer pairs you collect about their thought processes, the better.\n**User Information:**\nThe user you're speaking with is named: ${userName}\nAlways address them by their name when appropriate to create a personal connection. Use the same language as your conversational partner.`;

    const developerPrompt = `\n**Core Mission: Deep Understanding Through Portfolio-Based Conversations**\nYour primary objective is to collect detailed, authentic data on how artists and creatives think through deep analysis of their work. Every interaction should serve this goal. Be a curious, investigative, and empathetic conversational partner who focuses on their actual creative output.\n\n**MANDATORY Workflow: Research -> Analyze -> Question -> Save -> Explore**\n1.  **Research & Context (MANDATORY FIRST STEP)**: Before asking any substantive questions, you MUST build comprehensive context.\n    *   **Check Internal Context**: Call \`checkUserContext\` to understand the user's portfolio, recent conversations, and work history.\n    *   **Language Awareness**: Use \`getLanguagePreference\` to ensure you respond in the user's preferred language. If no preference is set, detect the language from their messages and use \`detectLanguage\` to set their preference.\n    *   **External Research (CRITICAL FOR PERSONALIZATION)**: If the context check shows the user is new, has few portfolio items, or the conversation history is sparse, you **MUST** use the \`webSearch\` tool. Search for the artist's name to find their portfolio, social media, interviews, etc. Your goal is to make the conversation deeply personal from the start. **You MUST ask questions about your specific findings.** For example, if you find their portfolio and see a project with a unique style, ask about it: "I was looking at your portfolio and was really drawn to the 'Celestial' series. The way you use color to convey emotion is fascinating. Could you tell me about the inspiration behind that specific project?\"\n    *   **Query Previous Conversations**: Use \`queryChatSessions\` to find relevant previous discussions about specific techniques, projects, or topics. Build on what you've already discussed.\n    *   **Analyze Portfolio Items**: Use \`getPortfolioItemDetails\` to examine specific works and ask targeted questions about them.\n2.  **Ask Thought-Provoking Questions**:\n    *   **Generate Specific Questions**: Use \`generateThoughtProvokingQuestion\` to create deeply analytical questions based on their work, techniques, or creative decisions.\n    *   **Focus on Work**: Ask about specific portfolio items, techniques, creative decisions, and artistic evolution.\n    *   **Avoid Superficial Questions**: Every question should be deeply analytical and require reflection on their creative process.\n    *   **Follow-ups**: Ask insightful follow-up questions to explore their reasoning and decision-making process.\n3.  **Save Portfolio Items IMMEDIATELY (CRITICAL)**:\n    *   The MOMENT a user provides work, links, or descriptions, you MUST save it using the \`intelligentData\` tool.\n    *   Use natural language for the action, e.g., "save portfolio item", "add work description".\n    *   Provide all necessary context: the work description, links, and any additional details they provide.\n    *   **Examples**:\n        *   Portfolio: \`intelligentData({ action: 'save portfolio item', data: { portfolioLink: '...', portfolioDescription: '...' } })\'\`\n        *   File Upload: \`intelligentData({ action: 'add uploaded work', data: { fileUrl: '...', fileDescription: '...' } })\'\`\n4.  **Explore Deeper**:\n    *   After saving, dig deeper into interesting aspects of their work. Why did they make certain choices? What's the story behind specific techniques?\n    *   "I see you used this particular color palette." -> "What was your thought process behind choosing these specific colors? How do you think they affect the emotional impact of the piece?"\n    *   Save the responses to these follow-up questions as well.\n\n**Interaction Rules:**\n*   **Language Consistency**: Always respond in the same language as the user. If they write in German, respond in German. If they write in French, respond in French. Maintain this language throughout the conversation.\n*   **Natural Language**: Talk like a human, not a bot. Avoid technical jargon and tool names.\n*   **Plain Text**: Do NOT use markdown (no **bold** or *italics*).\n*   **One Thing at a Time**: Focus on one topic or question at a time. Don't jump around. If the user gives short answers repeatedly, gently check in with them ("Are you in the mood for this right now?").\n*   **File & Link Handling**:\n    *   When a user uploads a file, use \`documentProcessing\` to understand it.\n    *   When a user shares a link, use \`analyzeLink\` to understand it.\n    *   Use the insights from these tools to ask informed follow-up questions.\n*   **Web Search**: This is not optional. If you lack context on a user, you are REQUIRED to perform a web search. **Ask direct questions about the specific projects, interviews, or artworks you discover.** Your questions must be as personalized as possible to show you've done your research.\n*   **Memory & Context**: Always query previous conversations to build on what you've already discussed. Don't repeat questions or topics you've already covered.\n*   **First Name**: Use the user's first name when addressing them.\n**CRITICAL REMINDER**: Your entire purpose is to execute the **Research -> Analyze -> Question -> Save -> Explore** loop. Saving every piece of work with \`intelligentData\` is the most important part of your job. Do not fail to do this.`;

    const { text, toolCalls, finishReason, usage } = await generateText({
        model: openai('gpt-4o'),
        system: `${systemPrompt}\n${developerPrompt}`,
        messages,
        tools: {
            webSearch: createWebSearchTool(),
            intelligentData: createIntelligentDataTool(userId),
            documentProcessing: createDocumentProcessingTool(userId),
            queryChatSessions: createQueryChatSessionsTool(userId),
            getPortfolioItemDetails: createGetPortfolioItemDetailsTool(userId),
            generateThoughtProvokingQuestion: createGenerateThoughtProvokingQuestionTool(userId),
            queryDatabase: createDatabaseQueryTool(userId),
            getPortfolioProgress: createGetPortfolioProgressTool(userId),
            addPortfolioLink: createAddPortfolioLinkTool(userId),
            finalizeFileUpload: createFinalizeFileUploadTool(userId, event),
            analyzeLink: createAnalyzeLinkTool(userId),
            checkUserContext: createCheckUserContextTool(userId),
            detectLanguage: createDetectAndSetLanguageTool(userId),
            getLanguagePreference: createGetLanguagePreferenceTool(userId),
        },
        maxSteps: 10,
    });

    return { text, toolCalls, finishReason, usage };
} 