import { ref, onUnmounted } from 'vue';
import type { CoreMessage } from 'ai';

interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  audioLevel: number;
  transcript: string;
  error: string | null;
}

// Add messages state for chat history
const messages = ref<CoreMessage[]>([]);

export const useVoiceAgent = () => {
  // State
  const state = ref<VoiceState>({
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
    audioLevel: 0,
    transcript: '',
    error: null
  });

  // Audio handling
  const mediaRecorder = ref<MediaRecorder | null>(null);
  const audioContext = ref<AudioContext | null>(null);
  const workletNode = ref<AudioWorkletNode | null>(null);
  const mediaStream = ref<MediaStream | null>(null);
  const currentAudio = ref<HTMLAudioElement | null>(null);

  // --- Initial Message Logic ---
  // Fetch the initial assistant greeting if no messages exist
  const getInitialMessage = async () => {
    if (messages.value.length === 0) {
      try {
        const response = await $fetch<{ content?: string | any }>(
          '/api/chat/message',
          {
            method: 'POST',
            body: { messages: [] }
          }
        );
        if (response.content) {
          messages.value.push({ role: 'assistant', content: response.content });
          // Speak the first message (TTS)
          // let ttsText = '';
          // if (typeof response.content === 'string') {
          //   ttsText = response.content;
          // } else if (Array.isArray(response.content) && response.content.length > 0) {
          //   // Try to find the first text part
          //   const firstTextPart = response.content.find((part: any) => part.type === 'text' && part.text);
          //   ttsText = firstTextPart ? firstTextPart.text : '';
          // }
          // if (ttsText) {
          //   await textToSpeech(ttsText);
          // }
        }
      } catch (error) {
        state.value.error = 'Failed to get initial message.';
        console.error('Initial message error:', error);
      }
    }
  };

  // Start voice recording with real-time processing
  const startRecording = async (): Promise<void> => {
    try {
      state.value.error = null;
      // Get microphone access
      mediaStream.value = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      // Setup audio context and worklet for real-time level monitoring
      audioContext.value = new AudioContext({ sampleRate: 16000 });
      await audioContext.value.audioWorklet.addModule('/voice-recorder.worklet.js');
      const source = audioContext.value.createMediaStreamSource(mediaStream.value);
      workletNode.value = new AudioWorkletNode(audioContext.value, 'voice-recorder-worklet');
      // Handle audio level updates from worklet
      workletNode.value.port.onmessage = (event) => {
        const { level } = event.data;
        state.value.audioLevel = level;
      };
      source.connect(workletNode.value);
      // Setup MediaRecorder for actual recording
      mediaRecorder.value = new MediaRecorder(mediaStream.value, {
        mimeType: 'audio/webm;codecs=opus'
      });
      const audioChunks: Blob[] = [];
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      mediaRecorder.value.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        await processVoiceInput(audioBlob);
      };
      mediaRecorder.value.start();
      state.value.isRecording = true;
    } catch (error: any) {
      state.value.error = 'Failed to access microphone. Please grant permission.';
      console.error('Recording start error:', error);
    }
  };

  // Stop recording and process
  const stopRecording = async (): Promise<void> => {
    if (mediaRecorder.value && state.value.isRecording) {
      mediaRecorder.value.stop();
      state.value.isRecording = false;
      state.value.audioLevel = 0;
      // Cleanup audio context
      if (audioContext.value) {
        await audioContext.value.close();
        audioContext.value = null;
      }
      if (mediaStream.value) {
        mediaStream.value.getTracks().forEach(track => track.stop());
        mediaStream.value = null;
      }
    }
  };

  // Process voice input through STT, LLM, and TTS pipeline
  const processVoiceInput = async (audioBlob: Blob, fullMessages?: any[]): Promise<string | null> => {
    try {
      state.value.isProcessing = true;
      state.value.error = null;
      // Step 1: Speech-to-Text
      const transcript = await speechToText(audioBlob);
      if (!transcript) {
        throw new Error('No speech detected');
      }
      state.value.transcript = transcript;
      // Step 2: Generate AI response using existing chat system
      // Pass the full session if provided, otherwise just the transcript
      const aiResponse = await generateAIResponse(transcript, fullMessages);
      // Step 3: Text-to-Speech with user's voice clone
      // await textToSpeech(aiResponse);
      // Store user and assistant messages in local state
      messages.value.push({ role: 'user', content: transcript });
      messages.value.push({ role: 'assistant', content: aiResponse });
      return aiResponse;
    } catch (error: any) {
      state.value.error = error.message || 'Failed to process voice input';
      console.error('Voice processing error:', error);
      return null;
    } finally {
      state.value.isProcessing = false;
    }
  };

  // Speech-to-Text using server endpoint
  const speechToText = async (audioBlob: Blob): Promise<string | null> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    const response = await $fetch<{ transcript?: string }>('/api/voice/stt', {
      method: 'POST',
      body: formData
    });
    return response.transcript || null;
  };

  // Generate AI response using existing chat message endpoint
  // Accepts the full messages array for proper session context
  const generateAIResponse = async (userMessage: string, fullMessages?: any[]): Promise<string> => {
    // If fullMessages is provided, append the new user message and send the whole session
    let messagesToSend;
    if (Array.isArray(fullMessages) && fullMessages.length > 0) {
      messagesToSend = [
        ...fullMessages,
        { role: 'user', content: userMessage }
      ];
    } else {
      messagesToSend = [
        { role: 'user', content: userMessage }
      ];
    }
    // Send the full session to the backend for context
    const response = await $fetch<{ content?: string }>('/api/chat/message', {
      method: 'POST',
      body: {
        messages: messagesToSend
      }
    });
    return response.content || 'I apologize, but I couldn\'t generate a response.';
  };

  // Text-to-Speech using user's voice clone
  // const textToSpeech = async (text: string): Promise<void> => {
  //   try {
  //     state.value.isPlaying = true;
  //     const response = await $fetch<{ audioUrl?: string; audioData?: string }>('/api/voice/tts', {
  //       method: 'POST',
  //       body: { text }
  //     });
  //     if (response.audioUrl) {
  //       await playAudio(response.audioUrl);
  //     } else if (response.audioData) {
  //       // Handle base64 encoded audio
  //       const audioBlob = new Blob([
  //         Uint8Array.from(atob(response.audioData), c => c.charCodeAt(0))
  //       ], { type: 'audio/mpeg' });
  //       const audioUrl = URL.createObjectURL(audioBlob);
  //       await playAudio(audioUrl);
  //       URL.revokeObjectURL(audioUrl);
  //     }
  //   } catch (error: any) {
  //     console.error('TTS error:', error);
  //     state.value.error = 'Failed to generate speech';
  //   } finally {
  //     state.value.isPlaying = false;
  //   }
  // };

  // Play audio with promise-based completion
  const playAudio = async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (currentAudio.value) {
        currentAudio.value.pause();
        currentAudio.value = null;
      }
      currentAudio.value = new Audio(audioUrl);
      currentAudio.value.onended = () => {
        resolve();
      };
      currentAudio.value.onerror = (error) => {
        reject(error);
      };
      currentAudio.value.play().catch(reject);
    });
  };

  // Cleanup function
  const cleanup = () => {
    if (state.value.isRecording) {
      stopRecording();
    }
    if (currentAudio.value) {
      currentAudio.value.pause();
      currentAudio.value = null;
    }
    if (audioContext.value) {
      audioContext.value.close();
    }
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach(track => track.stop());
    }
    // Clear messages if needed
    // messages.value = [];
  };

  // Auto-cleanup on unmount
  onUnmounted(cleanup);

  return {
    state: readonly(state),
    messages,
    getInitialMessage,
    startRecording,
    stopRecording,
    processVoiceInput,
    cleanup
  };
}; 