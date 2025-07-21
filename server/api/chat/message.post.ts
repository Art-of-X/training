import { type CoreMessage, type CoreUserMessage, type CoreAssistantMessage, type TextPart, type ImagePart, type FilePart } from 'ai';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~/server/utils/prisma';
import { generateAICoreResponse, generateChatSessionTitle } from '~/server/utils/ai-core';
import { PrismaClient } from '@prisma/client'; // Explicitly import PrismaClient

// Helper for detecting language
const detectLanguage = (text: string): string => {
  // Simple language detection based on common words
  const germanWords = ['ich', 'und', 'ist', 'die', 'der', 'das', 'ein', 'eine', 'zu', 'für', 'mit', 'auf', 'habe', 'nicht', 'bitte', 'danke', 'wenn'];
  const words = text.toLowerCase().split(/\s+/);
  
  // Count words that match German patterns
  const germanWordCount = words.filter(word => germanWords.includes(word)).length;
  
  // If more than 2 German words are found, assume it's German
  return germanWordCount > 1 ? 'de' : 'en';
};

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
    // Always fetch existing messages if we have a session ID
    if (currentSessionId) { 
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
        // Properly handle content based on its structure
        if (msg.role === 'user') {
          if (typeof msg.content === 'string') {
            return { role: 'user', content: [{ type: 'text' as const, text: msg.content }] } as CoreUserMessage;
          } else if (Array.isArray(msg.content)) {
            // Content is already structured
            return { role: 'user', content: msg.content } as CoreUserMessage;
          } else {
            // JSON object that needs to be stringified
            return { role: 'user', content: [{ type: 'text' as const, text: JSON.stringify(msg.content) }] } as CoreUserMessage;
          }
        } else if (msg.role === 'assistant') {
          if (typeof msg.content === 'string') {
            return { role: 'assistant', content: [{ type: 'text' as const, text: msg.content }] } as CoreAssistantMessage;
          } else if (Array.isArray(msg.content)) {
            // Content is already structured
            return { role: 'assistant', content: msg.content } as CoreAssistantMessage;
          } else {
            // JSON object that needs to be stringified
            return { role: 'assistant', content: [{ type: 'text' as const, text: JSON.stringify(msg.content) }] } as CoreAssistantMessage;
          }
        } else {
          // Fallback for unexpected roles
          return { role: 'user', content: [{ type: 'text' as const, text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }] } as CoreUserMessage;
        }
      });
    }

    const userMessage = messages.filter(m => m.role === 'user').pop();
    
    // Save user message to the database if it's not the initial prompt placeholder
    if (userMessage && userMessage.content) {
      const isInitialPrompt = typeof userMessage.content === 'string' && userMessage.content.includes('__INITIAL_PROMPT__');
      if (!isInitialPrompt) {
        // Determine content to save to DB (must be string)
        let contentToSave: string;
        if (typeof userMessage.content === 'string') {
            contentToSave = userMessage.content;
        } else if (Array.isArray(userMessage.content)) {
            // Concatenate text parts, ignore other types for DB saving for now
            contentToSave = userMessage.content.map(part => {
                if (part.type === 'text') return part.text;
                return ''; // Ignore other parts for string content in DB
            }).join(' ').trim();
        } else {
            contentToSave = JSON.stringify(userMessage.content); // Fallback for unexpected types
        }

        const messageData: any = {
          userId: user.id,
          role: 'user',
          content: contentToSave,
          sessionId: currentSessionId, // Ensure sessionId is always set
        };

        await prisma.chatMessage.create({
            data: messageData,
        });
      }
    }

    // Construct messagesForAI with full history + current message
    // Always ensure we include all existing messages from the session
    let messagesForAI: CoreMessage[] = [...existingMessages];

    // Append the latest user message from the current request
    if (userMessage && userMessage.content) {
      // Determine user language from message content
      let userLanguage = 'en'; // Default to English
      
      // Convert user message content to a format we can analyze
      const userContentText = typeof userMessage.content === 'string' 
          ? userMessage.content
          : Array.isArray(userMessage.content)
            ? userMessage.content.filter(part => part.type === 'text').map(part => (part as TextPart).text).join(' ')
            : '';
      
      // Detect language if we have text content
      if (userContentText) {
        userLanguage = detectLanguage(userContentText);
      } else if (existingMessages.length > 0) {
        // Try to determine language from previous messages
        const lastUserMsg = [...existingMessages].reverse().find(msg => msg.role === 'user');
        if (lastUserMsg && Array.isArray(lastUserMsg.content)) {
          const lastUserText = lastUserMsg.content
            .filter(part => part.type === 'text')
            .map(part => (part as TextPart).text)
            .join(' ');
          userLanguage = detectLanguage(lastUserText);
        }
      }
      
      // Format user message content consistently
      const contentForAI = typeof userMessage.content === 'string'
          ? [{ type: 'text' as const, text: userMessage.content }]
          : userMessage.content;
      
      let lastUserMessageContent = contentForAI;

      // Check if the current user message is the programmatic file upload instruction
      const programmaticFileUploadPromptStart = 'I have uploaded a file. Please use the documentProcessing tool to analyze this file:';
      if (typeof userMessage.content === 'string' && userMessage.content.startsWith(programmaticFileUploadPromptStart)) {
          // Extract the file URL and context from the original English prompt
          const urlStart = programmaticFileUploadPromptStart.length;
          const urlEnd = userMessage.content.indexOf('. The context is:');
          const fileUrl = userMessage.content.substring(urlStart, urlEnd !== -1 ? urlEnd : userMessage.content.length).trim();
          const contextPart = urlEnd !== -1 ? userMessage.content.substring(urlEnd + '. The context is:'.length).trim() : '';

          let localizedPrompt = '';
          if (userLanguage === 'de') {
              const localizedContext = contextPart.replace('user uploaded creative work or portfolio materials.', 'der Benutzer hat kreative Arbeit oder Portfoliomaterialien hochgeladen.');
              localizedPrompt = `Ich habe eine Datei hochgeladen. Bitte verwende das documentProcessing-Tool, um diese Datei zu analysieren: ${fileUrl}. Der Kontext ist: ${localizedContext}`;
          } else {
              localizedPrompt = userMessage.content; // Keep original English
          }
          lastUserMessageContent = [{ type: 'text' as const, text: localizedPrompt }];
      }

      messagesForAI.push({ role: 'user', content: lastUserMessageContent });
    }

    console.log(`Messages sent to AI (count: ${messagesForAI.length}):`, messagesForAI); // Enhanced debugging info
    const { text, toolCalls, finishReason, usage } = await generateAICoreResponse(user.id, userName, messagesForAI, event);
    
    // Save AI response to the database
    if (text && currentSessionId) { // Ensure sessionId exists before saving assistant message
        const assistantMessageData: any = {
          userId: user.id,
          role: 'assistant',
          content: text, // Reverted to plain string as per Prisma schema
          sessionId: currentSessionId, // Use the determined session ID
        };

        await prisma.chatMessage.create({
          data: assistantMessageData,
        });

        // Generate and update session title after AI responds, but only if it's the first actual user message
        // rawUserContent needs to be a string here
        const rawUserContentForTitle = typeof userMessage.content === 'string' ? userMessage.content : 
                                     (Array.isArray(userMessage.content) && userMessage.content[0]?.type === 'text' ? userMessage.content[0].text : '');

        // Handle type incompatibility between ai SDK and Prisma content types
        if (existingMessages.length === 0 && userMessage && typeof userMessage.content === 'string' && !userMessage.content.includes('__INITIAL_PROMPT__')) {
          const titleGenerationMessages: { role: string; content: string }[] = [
              { role: 'user', content: rawUserContentForTitle },
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
            { role: 'user', content: rawUserContentForTitle },
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
      statusMessage: e.message,
    });
  }
});