import { ref } from 'vue';
import { type CoreMessage } from 'ai';

export const useChat = () => {
  const messages = ref<CoreMessage[]>([]);
  const isLoading = ref(false);
  const error = ref<any>(null);
  
  // Voice-related state
  const isRecording = ref(false);
  const isPlayingTTS = ref(false);
  const isTTSEnabled = ref(false);
  const mediaRecorder = ref<MediaRecorder | null>(null);
  const audioChunks = ref<Blob[]>([]);
  const currentAudio = ref<HTMLAudioElement | null>(null);

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

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const { content } = await response.json();
      
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

    } catch (e) {
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
     messages.value = []; // Reset messages for a new chat
     const initialPrompt: CoreMessage[] = [
      { 
        role: 'user', 
        content: 'Welcome the user back. Your main goal is to guide them through their training. Determine the next single most important question they should answer from any module. Ask them this question directly and concisely. Do not start with a progress summary. Just ask the question.' 
      }
    ];
    // We don't push the user message to the history here, just send it.
    await sendMessage(initialPrompt);
  };
  
  const handleSubmit = async (userInput: string) => {
    if (!userInput || !userInput.trim()) return;

    const userMessage: CoreMessage = { role: 'user', content: userInput };
    messages.value.push(userMessage);

    await sendMessage(messages.value);
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
    try {
      isPlayingTTS.value = true;
      
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
      
      currentAudio.value.onended = () => {
        isPlayingTTS.value = false;
        URL.revokeObjectURL(audioUrl);
        currentAudio.value = null;
      };
      
      currentAudio.value.onerror = () => {
        isPlayingTTS.value = false;
        URL.revokeObjectURL(audioUrl);
        currentAudio.value = null;
      };
      
      await currentAudio.value.play();
    } catch (e) {
      isPlayingTTS.value = false;
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
    // Voice functionality
    isRecording,
    isPlayingTTS,
    isTTSEnabled,
    startRecording,
    stopRecording,
    toggleTTS,
    stopTTS
  };
}; 