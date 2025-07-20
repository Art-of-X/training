import { type CoreMessage, type CoreUserMessage, type CoreAssistantMessage } from 'ai';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~/server/utils/prisma';
import { generateAICoreResponse, generateChatSessionTitle } from '~/server/utils/ai-core';
import { PrismaClient } from '@prisma/client'; // Explicitly import PrismaClient

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { id: user.id },
      select: { name: true },
    });
    const userName = userProfile?.name || 'Artist';

    const { messages, sessionId: clientSessionId }: { messages: CoreMessage[]; sessionId?: string } = await readBody(event);

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: `messages` is required and must be a non-empty array.'
      });
    }

    let currentSessionId = clientSessionId;

    // If no sessionId is provided, it's a new session, create a ChatSession entry
    if (!currentSessionId) {
      const newSession = await (prisma as PrismaClient).chatSession.create({
        data: {
          userId: user.id,
          title: "New Chat", // Temporary title, will be updated after first AI response
        },
      });
      currentSessionId = newSession.id; // Use the ID of the newly created session
    }

    // Fetch existing messages for the session if sessionId is provided
    let existingMessages: (CoreUserMessage | CoreAssistantMessage)[] = []; 
    if (currentSessionId) { // Use currentSessionId for fetching
      const history = await prisma.chatMessage.findMany({
        where: {
          userId: user.id,
          sessionId: currentSessionId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          role: true,
          content: true,
        },
      });
      existingMessages = history.map(msg => {
        const contentString = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content); // Ensure content is string
        if (msg.role === 'user') {
          return { role: 'user', content: [{ type: 'text', text: contentString }] } as CoreUserMessage; // Use structured content for CoreUserMessage
        } else if (msg.role === 'assistant') {
          return { role: 'assistant', content: contentString } as CoreAssistantMessage; 
        } else {
          // Fallback for unexpected roles, though our schema typically only has user/assistant
          return { role: 'user', content: [{ type: 'text', text: contentString }] } as CoreUserMessage; 
        }
      });
    }

    const userMessage = messages.filter(m => m.role === 'user').pop();
    
    // Save user message to the database if it's not the initial prompt placeholder
    if (userMessage && userMessage.content) {
      const isInitialPrompt = typeof userMessage.content === 'string' && userMessage.content.includes('__INITIAL_PROMPT__');
      if (!isInitialPrompt) {
        const messageData: any = {
          userId: user.id,
          role: 'user',
          content: typeof userMessage.content === 'string' ? userMessage.content : JSON.stringify(userMessage.content),
          sessionId: currentSessionId, // Ensure sessionId is always set
        };

        await prisma.chatMessage.create({
            data: messageData,
        });
      }
    }

    // Construct messagesForAI with full history + current message
    let messagesForAI: CoreMessage[] = [];

    // Include existing messages from the session
    messagesForAI = [...existingMessages]; 

    // Append the latest user message from the current request, unless it's the initial prompt placeholder
    if (userMessage && userMessage.content) {
      const isInitialPrompt = typeof userMessage.content === 'string' && userMessage.content.includes('__INITIAL_PROMPT__');
      if (!isInitialPrompt) {
        // Ensure userMessage.content is converted to the expected structured format for CoreUserMessage
        const userContentFormatted = typeof userMessage.content === 'string' 
          ? [{ type: 'text', text: userMessage.content }]
          : (Array.isArray(userMessage.content) ? userMessage.content : [{ type: 'text', text: JSON.stringify(userMessage.content) }]);

        messagesForAI.push({ role: 'user', content: userContentFormatted } as CoreUserMessage);
      } else {
        // If it's the initial prompt placeholder, replace it with the full detailed prompt for the AI
        messagesForAI.push({
          role: 'user',
          content: [{ type: 'text', text: 'This is the user\'s first message in a new chat session. CRITICAL: You MUST first call checkUserContext tool to understand the user\'s portfolio and conversation history. Then use queryChatSessions to find relevant previous discussions. DO NOT repeat topics or questions you have already covered. After checking their context, start your response with a personalized welcome using their name and focus on their creative work. Ask specific, thought-provoking questions about their portfolio items, techniques, or creative decisions. Use generateThoughtProvokingQuestion tool to create deeply analytical questions based on their work. IMPORTANT: Use plain text only - no markdown formatting like **bold** or *italics*. MANDATORY WORKFLOW: When user shares work or responds to questions, save it IMMEDIATELY using the intelligentData tool before asking the next question.' }]
        } as CoreUserMessage);
      }
    }

    const { text, toolCalls, finishReason, usage } = await generateAICoreResponse(user.id, userName, messagesForAI, event);

    // Save AI response to the database
    if (text && currentSessionId) { // Ensure sessionId exists before saving assistant message
        const assistantMessageData: any = {
          userId: user.id,
          role: 'assistant',
          content: text,
          sessionId: currentSessionId, // Use the determined session ID
        };

        await prisma.chatMessage.create({
          data: assistantMessageData,
        });

        // Generate and update session title after AI responds, but only if it's the first actual user message
        const rawUserContent = typeof userMessage.content === 'string' ? userMessage.content : JSON.stringify(userMessage.content);

        if (existingMessages.length === 0 && userMessage && !userMessage.content.includes('__INITIAL_PROMPT__')) {
          const titleGenerationMessages: { role: string; content: string }[] = [
              { role: 'user', content: rawUserContent },
              { role: 'assistant', content: text }
          ];
  
          const newTitle = await generateChatSessionTitle({
            messages: titleGenerationMessages,
            userProfileName: userName,
          });
  
          await (prisma as PrismaClient).chatSession.update({
            where: { id: currentSessionId },
            data: { title: newTitle },
          });
        } else if (existingMessages.length > 0) {
          // For ongoing conversations, update the title based on the latest interaction
          const titleGenerationMessages: { role: string; content: string }[] = [
            // Map existingMessages back to string content for title generation
            ...existingMessages.map(msg => ({ 
                role: msg.role, 
                content: typeof msg.content === 'string' ? msg.content : 
                         (Array.isArray(msg.content) && msg.content[0]?.type === 'text' ? msg.content[0].text : '') 
            })),
            { role: 'user', content: rawUserContent },
            { role: 'assistant', content: text }
          ];
          const newTitle = await generateChatSessionTitle({
            messages: titleGenerationMessages,
            userProfileName: userName,
          });
          await (prisma as PrismaClient).chatSession.update({
            where: { id: currentSessionId },
            data: { title: newTitle },
          });
        }
    }

    return { content: text, toolCalls, sessionId: currentSessionId };
  } catch (e: any) {
    console.error(e);
    throw createError({
      statusCode: 500,
      statusMessage: e.message
    });
  }
}); 