import { ref } from 'vue';
import { type CoreMessage } from 'ai';

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

  const sendMessage = async (newMessages: CoreMessage[]) => {
    isLoading.value = true;
    error.value = null;

    // Add a placeholder for the assistant's response
    if (newMessages.some(m => m.role === 'user')) {
        messages.value.push({ role: 'assistant', content: '' });
    }

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

      if (currentSessionId.value) {
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
      
      // Update the last assistant message with the actual content
      const lastMessage = messages.value[messages.value.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content = content;
        
        // Play TTS if enabled
        if (isTTSEnabled.value && content && typeof content === 'string') {
          await playTTS(content);
        }
      } else {
        // This case handles the initial message where there's no user message yet
        messages.value.push({ role: 'assistant', content });
        
        // Play TTS if enabled
        if (isTTSEnabled.value && content && typeof content === 'string') {
          await playTTS(content);
        }
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
    messages.value = []; // Reset messages for a new chat
    currentSessionId.value = undefined; // Reset session ID for a new chat
    abortController = new AbortController();

    const initialPrompt: CoreMessage[] = [{
      role: 'user',
      content: '__INITIAL_PROMPT__'
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
    messages.value.push(userMessage);

    await sendMessage(messages.value);
  };

  // Function to set session ID and load messages for a historical session
  const loadSession = (sessionMessages: CoreMessage[], sessionId: string) => {
    stop(); // Abort any ongoing fetch requests
    messages.value = sessionMessages; // Load all messages from the selected session
    currentSessionId.value = sessionId; // Set the current session ID
    abortController = new AbortController(); // Re-create the controller for future requests
    // Do NOT trigger getInitialMessage here, as we are continuing an existing session.
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