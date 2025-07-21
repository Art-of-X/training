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
      });

      existingMessages = history.map(msg => {
        // Convert stored content (JSON string) to the expected format
        let content: ChatMessageContent;
        try {
          const parsedContent = JSON.parse(msg.content as string);
          // Ensure content is always an array of parts, even if stored as a single string
          content = Array.isArray(parsedContent) ? parsedContent : [{ type: 'text' as const, text: String(parsedContent) }];
        } catch (parseError) {
          console.error("Error parsing chat message content from DB:", parseError, msg.content);
          content = [{ type: 'text' as const, text: String(msg.content) }]; // Fallback to raw string
        }

        // Create the message object
        const message: any = { role: msg.role, content };
        
        // Add metadata if present (metadata is a Json field in Prisma and is also stringified)
        const msgAny = msg as any;
        if (msgAny.metadata) {
          try {
            message.metadata = JSON.parse(msgAny.metadata as string); // Parse metadata back to object
          } catch (parseError) {
            console.error("Error parsing chat message metadata from DB:", parseError, msgAny.metadata);
            message.metadata = {}; // Fallback to empty object
          }
        }

        return message as CoreUserMessage | CoreAssistantMessage;
      });
    }

    const userMessage = messages.filter(m => m.role === 'user').pop();
    
    // Save user message to the database
    if (userMessage && userMessage.content) {
      // The __INITIAL_PROMPT__ is now handled client-side in useChat.ts
      // so we no longer need to check for it here and can save all user messages.
      // const isInitialPrompt = typeof userMessage.content === 'string' 
      //   ? userMessage.content.includes('__INITIAL_PROMPT__')
      //   : Array.isArray(userMessage.content) 
      //     ? userMessage.content.some(part => part.type === 'text' && 'text' in part && part.text.includes('__INITIAL_PROMPT__'))
      //     : false;

      // if (!isInitialPrompt) {
        // Prepare content for saving
        const content = Array.isArray(userMessage.content) 
          ? userMessage.content 
          : typeof userMessage.content === 'string'
            ? [{ type: 'text' as const, text: userMessage.content }]
            : [{ type: 'text' as const, text: JSON.stringify(userMessage.content) }];

        // Determine message type based on content
        const hasFile = content.some(part => part.type === 'file' || part.type === 'image');
        const messageType = hasFile ? 'file_upload' : 'text';

        // Extract any metadata (e.g., file info)
        const metadata = {
          parts: content.map(part => {
            const basePart = { type: part.type };
            if (part.type === 'file') {
              const filePart = part as FilePart;
              return {
                ...basePart,
                url: (filePart as any).url,
                mimeType: filePart.mimeType
              };
            } else if (part.type === 'image') {
              const imagePart = part as ImagePart;
              return {
                ...basePart,
                url: imagePart.image,
                mimeType: imagePart.mimeType
              };
            }
            return basePart;
          })
        };

        // Save the message with structured content
        await prisma.chatMessage.create({
          data: {
            userId: user.id,
            role: 'user',
            type: messageType, // Keep type field as per schema
            content: JSON.stringify(content) as any, // Stringify and cast to any for Json field
            metadata: JSON.stringify(metadata) as any, // Stringify and cast to any for Json field
            sessionId: currentSessionId!,
          },
        });
      // }
    }

    // Construct messagesForAI with full history + current message
    // Always ensure we include all existing messages from the session
    let messagesForAI: CoreMessage[] = [...existingMessages];

    // Append the latest user message from the current request
    if (userMessage && userMessage.content) {
      // Format user message content consistently
      const contentForAI = typeof userMessage.content === 'string'
          ? [{ type: 'text' as const, text: userMessage.content }]
          : userMessage.content;
      
      let lastUserMessageContent = contentForAI;
      
      // Handle initial prompt - replace with actual initial message
      if (typeof userMessage.content === 'string' && userMessage.content.includes('__INITIAL_PROMPT__')) {
        lastUserMessageContent = [{ 
          type: 'text' as const, 
          text: 'Hello! I\'m your AI assistant. I\'m here to help you with your creative training, portfolio development, and any questions you might have. How can I assist you today?' 
        }];
      }

      // Check if the current user message is the programmatic file upload instruction
      const programmaticFileUploadPromptStart = 'I have uploaded a file. Please use the documentProcessing tool to analyze this file:';
      if (typeof userMessage.content === 'string' && userMessage.content.startsWith(programmaticFileUploadPromptStart)) {
          lastUserMessageContent = [{ type: 'text' as const, text: userMessage.content }];
      }

      messagesForAI.push({ role: 'user', content: lastUserMessageContent });
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
          type: messageType, // Keep type field as per schema
          content: JSON.stringify(assistantMessageContent) as any, // Stringify and cast to any for Json field
          ...(metadata && { metadata: JSON.stringify(metadata) as any }), // Stringify and cast to any for Json field
          sessionId: currentSessionId,
        },
      });
      
      // Update the chat session title if this is the first message
      if (existingMessages.length === 0) {
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
