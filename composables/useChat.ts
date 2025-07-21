import { ref } from 'vue';
import { type CoreMessage, type TextPart, type ImagePart, type FilePart } from 'ai';

export const useChat = () => {
  const messages = ref<CoreMessage[]>([]);
  const isLoading = ref(false);
  const error = ref<any>(null);
  const currentSessionId = ref<string | undefined>(undefined); // New: Store current session ID
  let abortController = new AbortController();

  const stop = () => {
    abortController.abort();
    if (isLoading.value) {
      isLoading.value = false;
    }
  };
  
  // Voice-related state
  const isRecording = ref(false);
  const isPlayingTTS = ref(false);
  const isTTSEnabled = ref(false);
  const mediaRecorder = ref<MediaRecorder | null>(null);
  const audioChunks = ref<Blob[]>([]);
  const currentAudio = ref<HTMLAudioElement | null>(null);
  
  // Audio events for precise timing
  const audioStarted = ref(false);
  const audioPlaybackListeners = ref<(() => void)[]>([]);

  const sendMessage = async (newMessages: CoreMessage[], currentSessionIdForRequest?: string) => {
    isLoading.value = true;
    error.value = null;

    // Remove the placeholder logic from here - it's handled by the UI now
    // if (newMessages.some(m => m.role === 'user')) {
    //     messages.value.push({ role: 'assistant', content: '' });
    // }

    try {
      // Filter out any messages that might have empty content before sending.
      const messagesToSend = newMessages.filter(m => {
        if (typeof m.content === 'string') {
          return m.content.trim() !== '';
        }
        // Keep non-string content blocks, assuming they are valid (e.g., for multi-modal input in the future)
        return true;
      });

      const payload: { messages: CoreMessage[]; sessionId?: string } = {
        messages: messagesToSend,
      };

      if (currentSessionIdForRequest !== undefined) {
        // Use the provided sessionId for this specific request
        payload.sessionId = currentSessionIdForRequest;
      } else if (currentSessionId.value) {
        // Otherwise, use the composable's current sessionId
        payload.sessionId = currentSessionId.value;
      }

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { content, sessionId: returnedSessionId } = await response.json();
      
      // Always update the currentSessionId if a new one is returned
      if (returnedSessionId) {
          currentSessionId.value = returnedSessionId;
      }
      
      // Update the last assistant message with the actual content if it's a placeholder
      const lastAssistantPlaceholder = messages.value.findLast(m => m.role === 'assistant' && m.content === '');
      if (lastAssistantPlaceholder) {
        lastAssistantPlaceholder.content = content;
      } else {
        // If no placeholder, just push the new message (e.g., for initial message)
        messages.value.push({ role: 'assistant', content });
      }
        
        // Play TTS if enabled
        if (isTTSEnabled.value && content && typeof content === 'string') {
          await playTTS(content);
        }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Fetch aborted.');
        // Remove the placeholder message if the request was aborted
        const lastMessage = messages.value[messages.value.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
          messages.value.pop();
        }
        return; // Stop further processing
      }
      error.value = e;
      const lastMessage = messages.value[messages.value.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = 'Sorry, I ran into an error.';
      }
    } finally {
      isLoading.value = false;
    }
  };

  const getInitialMessage = async () => {
    isLoading.value = true;
    error.value = null;
    
    // Only reset for truly new chats (when no session exists and no messages)
    // Don't reset on re-initialization if we already have a session
    const isNewChat = !currentSessionId.value && messages.value.length === 0;
    
    if (isNewChat) {
      messages.value = []; // Reset messages for a new chat
      currentSessionId.value = undefined; // Reset session ID for a new chat
    }
    
    abortController = new AbortController();

    const initialPrompt: CoreMessage[] = [{
      role: 'user',
      // This initial prompt is for the AI, not user display
      content: 'Hello! I\'m your AI assistant. I\'m here to help you with your creative training, portfolio development, and any questions you might have. How can I assist you today?' 
    }];

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: initialPrompt, sessionId: currentSessionId.value }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { content, sessionId: returnedSessionId } = await response.json();

      // Set the session ID from the response
      if (returnedSessionId) {
        currentSessionId.value = returnedSessionId;
      }

      // Only push the AI's actual response to messages.value
      if (content) {
        messages.value.push({ role: 'assistant', content });
      }

      // Play TTS if enabled and content exists
      if (isTTSEnabled.value && content && typeof content === 'string') {
        await playTTS(content);
      }

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Fetch aborted.');
        // Remove the placeholder message if the request was aborted
        const lastMessage = messages.value[messages.value.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
          messages.value.pop();
        }
        return; // Stop further processing
      }
      error.value = e;
      console.error('Error getting initial message:', e);
      // Provide a fallback message if API fails
      messages.value.push({
        role: 'assistant',
        content: 'Welcome back! How can I help you with your training today?'
      });
    } finally {
      isLoading.value = false;
    }
  };
  
  const handleSubmit = async (userInput: string) => {
    if (!userInput || !userInput.trim()) return;

    const userMessage: CoreMessage = { role: 'user', content: userInput };
    messages.value.push(userMessage); // Add user message to local state immediately

    // Add a placeholder for the assistant's response immediately after user message
    messages.value.push({ role: 'assistant', content: '' });

    // Send all current messages (including the new user message) to the server
    // The server will handle fetching the full history based on sessionId
    await sendMessage(messages.value);
  };

  // Function to set session ID and load messages for a historical session
  const loadSession = async (sessionMessages: CoreMessage[], sessionId: string) => {
    stop(); // Abort any ongoing fetch requests
    
    // Set the session ID immediately
    currentSessionId.value = sessionId;

    // Process messages to ensure proper formatting and preserve document context
    const processedMessages: CoreMessage[] = sessionMessages.map(msg => {
      let content: string | (TextPart | ImagePart | FilePart)[];
      let metadata: any = undefined; // Initialize metadata as undefined

      // Handle content parsing based on message role
      if (msg.role === 'user' || msg.role === 'assistant') {
        try {
          const parsedContent = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
          // Ensure content is always an array of parts for user/assistant messages
          content = Array.isArray(parsedContent) ? parsedContent : [{ type: 'text' as const, text: String(parsedContent) }];
        } catch (e) {
          console.error('Error parsing user/assistant message content from history:', e, msg.content);
          content = [{ type: 'text' as const, text: String(msg.content) }]; // Fallback
        }

        // If metadata is present and a string, attempt to parse it
        if ((msg as any).metadata && typeof (msg as any).metadata === 'string') {
          try {
            metadata = JSON.parse((msg as any).metadata);
          } catch (e) {
            console.error('Error parsing message metadata from history:', e, (msg as any).metadata);
            metadata = undefined; // Fallback
          }
        }
      } else {
        // For system messages, content should always be a string.
        // If it's an array from the DB, convert it to a single string representation.
        let systemContentString: string;
        try {
          const parsedSystemContent = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
          systemContentString = Array.isArray(parsedSystemContent)
            ? parsedSystemContent.map(part => (part.type === 'text' ? part.text : `[${part.type}]`)).join(' ')
            : String(parsedSystemContent);
        } catch (e) {
          console.error('Error parsing system message content from history:', e, msg.content);
          systemContentString = String(msg.content); // Fallback to raw string
        }
        content = systemContentString;
        metadata = undefined; // System messages do not have metadata in this context
      }

      return {
        ...msg,
        content,
        metadata,
      };
    });
    
    // Set messages to the loaded history
    messages.value = processedMessages;
    
    abortController = new AbortController(); // Re-create the controller for future requests
    
    console.log('Loaded session:', {
      sessionId,
      messageCount: processedMessages.length,
      hasSystemMessages: processedMessages.some(m => m.role === 'system'),
      messageRoles: processedMessages.map(m => m.role)
    });

    // After loading, ensure the AI has the full context by sending the last user message again
    // or trigger an initial message if the session is empty.
    const lastUserMessage = processedMessages.findLast(m => m.role === 'user');
    if (lastUserMessage) {
      // Send the entire loaded history to the backend with the last user message
      await sendMessage(processedMessages, sessionId); 
    } else if (processedMessages.length === 0) {
      // If an empty session is loaded, trigger the initial message
      await getInitialMessage();
    }
  };

  // Voice functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder.value = new MediaRecorder(stream);
      audioChunks.value = [];
      
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.value.push(event.data);
        }
      };
      
      mediaRecorder.value.onstop = async () => {
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });
        await processAudioInput(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.value.start();
      isRecording.value = true;
    } catch (e) {
      error.value = e;
      console.error('Error starting recording:', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.value && isRecording.value) {
      mediaRecorder.value.stop();
      isRecording.value = false;
    }
  };

  const processAudioInput = async (audioBlob: Blob) => {
    try {
      isLoading.value = true;
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch('/api/voice/stt', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }
      
      const { text } = await response.json();
      
      if (text && text.trim()) {
        await handleSubmit(text.trim());
      }
    } catch (e) {
      error.value = e;
      console.error('Error processing audio:', e);
    } finally {
      isLoading.value = false;
    }
  };

  const playTTS = async (text: string) => {
    // Early return if TTS is disabled - safety check
    if (!isTTSEnabled.value) {
      return;
    }
    
    try {
      isPlayingTTS.value = true;
      audioStarted.value = false; // Reset audio started state
      
      // Stop any currently playing audio
      if (currentAudio.value) {
        currentAudio.value.pause();
        currentAudio.value = null;
      }
      
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      currentAudio.value = new Audio(audioUrl);
      
      // Set audioStarted when audio actually begins playing
      currentAudio.value.onplay = () => {
        console.log('Composable: Audio playback started');
        audioStarted.value = true;
      };
      
      currentAudio.value.onended = () => {
        console.log('Composable: Audio playback ended');
        isPlayingTTS.value = false;
        audioStarted.value = false;
        URL.revokeObjectURL(audioUrl);
        currentAudio.value = null;
      };
      
      currentAudio.value.onerror = () => {
        console.log('Composable: Audio playback error');
        isPlayingTTS.value = false;
        audioStarted.value = false;
        URL.revokeObjectURL(audioUrl);
        currentAudio.value = null;
      };
      
      await currentAudio.value.play();
    } catch (e) {
      isPlayingTTS.value = false;
      audioStarted.value = false;
      console.error('Error playing TTS:', e);
    }
  };

  const toggleTTS = () => {
    isTTSEnabled.value = !isTTSEnabled.value;
    
    // Stop current audio if disabling TTS
    if (!isTTSEnabled.value && currentAudio.value) {
      currentAudio.value.pause();
      isPlayingTTS.value = false;
    }
  };

  const stopTTS = () => {
    if (currentAudio.value) {
      currentAudio.value.pause();
      isPlayingTTS.value = false;
    }
  };

  return {
    messages,
    handleSubmit,
    isLoading,
    error,
    getInitialMessage,
    loadSession, // New: Expose loadSession
    currentSessionId, // Expose currentSessionId
    // Voice functionality
    isRecording,
    isPlayingTTS,
    audioStarted, // Expose for precise audio timing
    isTTSEnabled,
    startRecording,
    stopRecording,
    toggleTTS,
    stopTTS,
    stop, // Expose stop function
  };
}; 