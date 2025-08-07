import { type CoreMessage, type CoreUserMessage, type CoreAssistantMessage, type TextPart, type ImagePart, type FilePart } from 'ai';
import { serverSupabaseUser } from '#supabase/server';
import { prisma } from '~/server/utils/prisma';
import { generateAICoreResponse, generateChatSessionTitle } from '~/server/utils/ai-core';
import { PrismaClient } from '@prisma/client';
import type { H3Event } from 'h3';

type ChatMessageContent = Array<TextPart | ImagePart | FilePart>;

// Helper for detecting language
// const detectLanguage = (text: string): string => {
//   // Simple language detection based on common words
//   const germanWords = ['ich', 'und', 'ist', 'die', 'der', 'das', 'ein', 'eine', 'zu', 'für', 'mit', 'auf', 'habe', 'nicht', 'bitte', 'danke', 'wenn'];
//   const words = text.toLowerCase().split(/\s+/);
  
//   // Count words that match German patterns
//   const germanWordCount = words.filter(word => germanWords.includes(word)).length;
  
//   // If more than 2 German words are found, assume it's German
//   return germanWordCount > 1 ? 'de' : 'en';
// };

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

    let currentSessionId = clientSessionId;

    // --- LANGUAGE PREFERENCE LOGIC ---
    const preferences = await prisma.userPreferences.findUnique({ where: { userId: user.id } });
    let preferredLanguage = preferences?.preferredLanguage;
    let languageJustSet = false;

    // If this is a new chat (no sessionId and no messages), check language preference
    if ((!clientSessionId || !currentSessionId) && (!messages || messages.length === 0)) {
      // If no preferred language, allow the assistant to ask for it (handled by prompt)
      // If preferred language exists, inject it into the system prompt context
      if (!currentSessionId) {
        const newSession = await (prisma as PrismaClient).chatSession.create({
          data: {
            userId: user.id,
            title: "New Chat",
          },
        });
        currentSessionId = newSession.id;
      }
      // If preferredLanguage exists, inject a system message to set the language context
      let initialSystemMessage: CoreMessage[];
      if (preferredLanguage) {
        initialSystemMessage = [{ role: 'system' as const, content: `Preferred language: ${preferredLanguage}` }];
      } else {
        initialSystemMessage = [{ role: 'system' as const, content: 'Start the conversation' }];
      }
      const { text: initialText } = await generateAICoreResponse(
        user.id,
        userName,
        initialSystemMessage,
        process.env.SUPABASE_URL || ''
      );
      const assistantMessageContent = Array.isArray(initialText) ? initialText : [{ type: 'text' as const, text: initialText }];
      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: 'assistant',
          content: JSON.stringify(assistantMessageContent) as any,
          sessionId: currentSessionId,
        },
      });
      return {
        content: assistantMessageContent,
        sessionId: currentSessionId,
        preferredLanguage,
      };
    }

    // --- END LANGUAGE PREFERENCE LOGIC ---

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
    if (currentSessionId) { 
      const history = await prisma.chatMessage.findMany({
        where: {
          userId: user.id,
          sessionId: currentSessionId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      existingMessages = history.map(msg => {
        let content: ChatMessageContent;
        try {
          const parsedContent = JSON.parse(msg.content as string);
          content = Array.isArray(parsedContent) ? parsedContent : [{ type: 'text' as const, text: String(parsedContent) }];
        } catch (parseError) {
          console.error("Error parsing chat message content from DB:", parseError, msg.content);
          content = [{ type: 'text' as const, text: String(msg.content) }];
        }
        const message: any = { role: msg.role, content };
        const msgAny = msg as any;
        if (msgAny.metadata) {
          try {
            message.metadata = JSON.parse(msgAny.metadata as string);
          } catch (parseError) {
            console.error("Error parsing chat message metadata from DB:", parseError, msgAny.metadata);
            message.metadata = {};
          }
        }
        return message as CoreUserMessage | CoreAssistantMessage;
      });
    }

    // --- SET LANGUAGE IF USER ANSWERED IT ---
    // If the user just answered the language question, update their preference
    // (Assume: if the first user message is a language answer and no preference is set)
    if (!preferredLanguage && messages && messages.length === 1 && messages[0].role === 'user') {
      const userLangAnswer = String(messages[0].content).toLowerCase();
      // Naive detection: look for common language names
      if (userLangAnswer.includes('deutsch') || userLangAnswer.includes('german')) {
        await prisma.userPreferences.upsert({
          where: { userId: user.id },
          update: { preferredLanguage: 'de', updatedAt: new Date() },
          create: { userId: user.id, preferredLanguage: 'de', ttsEnabled: true, memory: '' },
        });
        preferredLanguage = 'de';
        languageJustSet = true;
      } else if (userLangAnswer.includes('english') || userLangAnswer.includes('englisch')) {
        await prisma.userPreferences.upsert({
          where: { userId: user.id },
          update: { preferredLanguage: 'en', updatedAt: new Date() },
          create: { userId: user.id, preferredLanguage: 'en', ttsEnabled: true, memory: '' },
        });
        preferredLanguage = 'en';
        languageJustSet = true;
      } // Add more languages as needed
    }

    // Restore userMessage definition for later use
    const userMessage = messages.filter(m => m.role === 'user').pop();

    // Only save user message if it's not the initial prompt (no more initial prompt detection needed)
    if (userMessage && userMessage.content) {
      const content = Array.isArray(userMessage.content) 
        ? userMessage.content 
        : typeof userMessage.content === 'string'
          ? [{ type: 'text' as const, text: userMessage.content }]
          : [{ type: 'text' as const, text: JSON.stringify(userMessage.content) }];
      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: 'user',
          content: JSON.stringify(content) as any,
          sessionId: currentSessionId!,
        },
      });
    }

    // Construct messagesForAI with full history + current message
    let messagesForAI: CoreMessage[] = [...existingMessages];

    // If this is the initial prompt, do not append a user message, just return the assistant greeting
    // This block is now redundant as initial prompt detection is removed.
    // if (isInitialPrompt) {
    //   const assistantGreeting = [{
    //     type: 'text' as const,
    //     text: "Hello! I'm your AI assistant. I'm here to help you with your creative training, portfolio development, and any questions you might have. How can I assist you today?"
    //   }];
    //   // Save the assistant greeting as the first assistant message
    //   await prisma.chatMessage.create({
    //     data: {
    //       userId: user.id,
    //       role: 'assistant',
    //       content: JSON.stringify(assistantGreeting) as any,
    //       sessionId: currentSessionId!,
    //     },
    //   });
    //   // Update the chat session title
    //   await prisma.chatSession.update({
    //     where: { id: currentSessionId! },
    //     data: { title: 'New Chat' },
    //   });
    //   return {
    //     content: assistantGreeting,
    //     sessionId: currentSessionId,
    //   };
    // }

    // Append the latest user message from the current request (if not initial prompt)
    if (userMessage && userMessage.content) {
      const contentForAI = typeof userMessage.content === 'string'
          ? [{ type: 'text' as const, text: userMessage.content }]
          : userMessage.content;
      messagesForAI.push({ role: 'user', content: contentForAI });
    }

    // Generate AI response with proper error handling
    console.log(`Messages sent to AI (count: ${messagesForAI.length}):`, messagesForAI);
    
    if (!Array.isArray(messagesForAI) || messagesForAI.length === 0) {
      // If the messagesForAI is empty, it means the client sent an empty list or only system messages
      // and there's no existing history to append. This is likely an error condition.
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid messages provided for AI processing or chat history retrieval.',
      });
    }

    const { text, toolCalls, finishReason, usage } = await generateAICoreResponse(
      user.id,
      userName,
      messagesForAI,
      process.env.SUPABASE_URL || ''
    );
    
    // Save AI response to the database
    if (text && currentSessionId) {
      // Determine if this is a tool call response
      const isToolCall = toolCalls && toolCalls.length > 0;
      const messageType = isToolCall ? 'tool_call' : 'text';
      
      // Prepare metadata for tool calls if present
      const metadata = isToolCall ? { toolCalls } : undefined;
      
      // Create the assistant message with structured content
      const assistantMessageContent = Array.isArray(text) ? text : [{ type: 'text' as const, text }];
      
      // Save the assistant's response
      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: 'assistant',
          content: JSON.stringify(assistantMessageContent) as any, // Stringify and cast to any for Json field
          ...(metadata && { metadata: JSON.stringify(metadata) as any }), // Stringify and cast to any for Json field
          sessionId: currentSessionId,
        },
      });
      
      // Update the chat session title if it's the default "New Chat"
      const chatSession = await prisma.chatSession.findUnique({
        where: { id: currentSessionId },
        select: { title: true },
      });

      if (chatSession && chatSession.title === "New Chat") {
        // Convert messages to simple string format for title generation
        const titleMessages = messagesForAI.map(msg => ({
          role: msg.role,
          content: Array.isArray(msg.content) 
            ? msg.content.filter(part => part.type === 'text').map(part => (part as any).text).join(' ')
            : String(msg.content)
        }));
        
        const title = await generateChatSessionTitle({
          messages: titleMessages,
          userProfileName: userName,
        });
        if (title) {
          await prisma.chatSession.update({
            where: { id: currentSessionId },
            data: { title },
          });
        }
      }
      
      // Return the response with the session ID
      return {
        content: text,
        toolCalls,
        finishReason,
        usage,
        sessionId: currentSessionId,
      };
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
