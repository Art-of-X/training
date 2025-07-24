<template>
  <div class="flex flex-col items-center space-y-4">
    <!-- Microphone Error UI -->
    <div v-if="micError" class="flex flex-col items-center space-y-2 w-full max-w-md mt-4">
      <div class="text-red-500 text-center text-sm">{{ micError }}</div>
      <button @click="retryMicAccess" class="btn-primary px-4 py-2 mt-2">Retry Microphone Access</button>
      <div class="text-xs text-gray-500 mt-1 text-center">
        If you don't see a browser prompt, check your browser's address bar or site settings to allow microphone access.
      </div>
    </div>

    <!-- Main VoiceAgent UI -->
    <template v-else>
      <!-- History button removed, now managed in dashboard -->
      
      <VoiceAgentX :audioLevel="currentAudioLevel" :mode="currentMode" :forceReinit="forceReinitCounter" />
      
      <!-- Start Button (when not connected) -->
      <div v-if="!isConnected" class="flex items-center space-x-2">
        <button
          @click="toggleConnection"
          :disabled="isProcessing || isUploadingFile"
          :class="[
            'px-6 py-3 rounded-lg font-medium transition-all duration-200 btn-primary',
            isProcessing || isUploadingFile ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
          ]"
        >
          <span v-if="isProcessing">Connecting...</span>
          <span v-else>Start Voice Agent</span>
        </button>
      </div>

      <!-- Input Form (when connected) -->
      <div v-if="isConnected" class="flex flex-col items-center space-y-4 w-full max-w-md"> <!-- Added w-full max-w-md here -->
        <!-- Text Input Bar with Attach Button and Pause -->
        <form @submit.prevent="handleTextInput" class="flex items-center space-x-2 w-full mt-2">
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileUpload" 
            class="hidden" 
          />
          <button
            type="button"
            @click="triggerFileUpload"
            :disabled="isProcessing || isUploadingFile"
            class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Upload a file"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
            </svg>
          </button>
          
          <!-- Pause Button -->
          <button
            type="button"
            @click="pauseVoiceAgent"
            class="p-2 rounded-lg text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 focus:outline-none transition-colors"
            aria-label="Pause voice agent"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </button>
          
          <input
            v-model="textInput"
            type="text"
            placeholder="Speak or type your message..."
            class="flex-1 p-2 border rounded-lg bg-white dark:bg-secondary-800 dark:border-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            :disabled="isProcessing || isUploadingFile"
          />
          <button type="submit" class="btn-primary" :disabled="isProcessing || isUploadingFile || !textInput.trim()">
            Send
          </button>
        </form>
      </div>

      <!-- Upload Progress -->
      <div v-if="isUploadingFile" class="text-sm text-blue-600 dark:text-blue-400 text-center">
        Uploading file...
      </div>

      <!-- Upload Error -->
      <div v-if="uploadError" class="text-sm text-red-500 text-center">
        {{ uploadError }}
      </div>

      <!-- Small Status Notification -->
      <div class="text-sm text-gray-600 dark:text-gray-400 text-center">
        {{ voiceStatus }}
      </div>

      <!-- History Modal -->
      <!-- History Modal -->
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch, defineExpose } from 'vue';
import { useChat } from '~/composables/useChat';
// Remove ChatHistoryModal import
// import ChatHistoryModal from '~/components/ChatHistoryModal.vue'
import { useWavRecorder } from '~/composables/useMediaRecorder'
// Import useVoiceAgent for standalone usage
import { useVoiceAgent } from '~/composables/useVoiceAgent'

// Session management to prevent audio overlap (This is a local counter for media stream session, not chat session)
const sessionCounter = ref(0);

// State management
const error = ref<string | null>(null);
const isConnected = ref(false);
const isProcessing = ref(false);
const isSpeaking = ref(false);
const audioLevel = ref(0);
const voiceStatus = ref('Click "Start Voice Agent" to begin');
const hasInitialized = ref(false);
const micError = ref<string | null>(null); // Track microphone permission errors

// Import messages, loadSession, getInitialMessage, and handleSubmit from useChat
const { 
  messages, 
  loadSession: loadComposableSession, 
  getInitialMessage: getComposableInitialMessage, 
  handleSubmit, 
  isLoading,
  isTTSEnabled: composableTTSEnabled,
  toggleTTS: toggleComposableTTS,
  isPlayingTTS: composableIsPlayingTTS, // Add this to watch TTS state
  audioStarted: composableAudioStarted, // Add this for precise audio timing
  stopTTS: composableStopTTS // Add this to stop TTS when user speaks
} = useChat();

// Use only composable's TTS states
const isTTSEnabled = composableTTSEnabled;
const isPlayingTTS = composableIsPlayingTTS;

// VoiceAgentX props
const currentAudioLevel = ref(0);
const currentMode = ref('idle'); // 'idle', 'input', 'output'
const forceReinitCounter = ref(0);

// File upload state
const fileInput = ref<HTMLInputElement | null>(null);
const isUploadingFile = ref(false);
const uploadError = ref<string | null>(null);

// History Modal State
interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  chatMessages: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }[];
}

// Remove all chat history modal state and logic
// const showHistoryModal = ref(false);
// const chatHistory = ref<ChatSession[]>([]);
// const loadingHistory = ref(false);
// const historyError = ref<Error | null>(null);
// const groupedHistory = computed(() => { ... });
// const fetchChatHistory = async () => { ... };
// const loadSession = async (sessionMessages, sessionId) => { ... };
// watch(showHistoryModal, ...);

// Group history by date and show session titles
const groupedHistory = computed(() => {
  const groups: { [key: string]: { id: string; title: string; time: string; messageCount: number; messages: { role: string; content: string }[] }[] } = {};
  
  // This part of the code is no longer needed as chat history is managed in the dashboard.
  // The original code had this logic, but it's now redundant.
  // chatHistory.value.forEach(session => {
  //   const sessionDate = new Date(session.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  //   const sessionTime = new Date(session.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  //   if (!groups[sessionDate]) {
  //     groups[sessionDate] = [];
  //   }
    
  //   groups[sessionDate].push({
  //     id: session.id,
  //     title: session.title || 'Untitled Chat', // Use session title
  //     time: sessionTime,
  //     messageCount: session.chatMessages.length,
  //     messages: session.chatMessages.map(msg => ({ role: msg.role, content: msg.content }))
  //   });
  // });
  
  // Sort dates descending
  // const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  // const sortedGroups: typeof groups = {};
  // sortedDates.forEach(date => {
  //   sortedGroups[date] = groups[date].sort((a, b) => { // Sort sessions within a day by time (descending)
  //     const timeA = new Date(`1/1/2000 ${a.time}`).getTime();
  //     const timeB = new Date(`1/1/2000 ${b.time}`).getTime();
  //     return timeB - timeA;
  //   });
  // });

  return {}; // Return empty object as history is managed externally
});

// Remove View History button and ChatHistoryModal from template
// const fetchChatHistory = async () => {
//   loadingHistory.value = true;
//   historyError.value = null;
//   try {
//     // Fetch all chat sessions with their messages
//     const data = await $fetch<ChatSession[]>('/api/chat/history');
//     chatHistory.value = data;
//   } catch (e: any) {
//     historyError.value = e;
//     console.error('Failed to fetch chat history:', e);
//   } finally {
//     loadingHistory.value = false;
//   }
// };

// Remove View History button and ChatHistoryModal from template
// const loadSession = async (sessionMessages: { role: string; content: string }[], sessionId: string) => {
//   // Stop any ongoing audio playback first
//   // cleanupTTSAudio(); // This function is no longer needed
  
//   // Clear current messages and load selected session using the composable's loadSession
//   loadComposableSession(sessionMessages, sessionId); // Call the composable's loadSession
//   hasInitialized.value = true; // Mark as initialized to prevent initial message on load
//   showHistoryModal.value = false; // Close modal
//   await nextTick();
//   // No specific scroll needed as VoiceAgent doesn't display chat directly
// };

// watch(showHistoryModal, (newVal) => {
//   if (newVal) {
//     fetchChatHistory();
//   }
// });

// Watch composable's TTS state for visual mode updates
watch(() => isLoading.value, (loading) => {
  console.log('VoiceAgent: Composable loading state changed:', loading);
  if (loading) {
    voiceStatus.value = 'AI is thinking...';
    isProcessing.value = true;
  }
});

// Watch composable's TTS playback for visual mode
watch(() => composableTTSEnabled.value, (enabled) => {
  console.log('VoiceAgent: Composable TTS enabled:', enabled);
  // Ensure TTS stays enabled when voice agent is connected
  if (!enabled && isConnected.value) {
    console.log('VoiceAgent: Re-enabling TTS for connected voice agent');
    composableTTSEnabled.value = true;
  }
});

// Add audio level simulation during TTS for VoiceAgentX
watch(() => composableIsPlayingTTS.value, (isPlaying) => {
  console.log('VoiceAgent: Composable TTS playing state changed:', isPlaying);
  if (isPlaying) {
    console.log('VoiceAgent: TTS started - switching to output mode');
    currentMode.value = 'output';
    voiceStatus.value = 'Speaking...';
  } else if (isConnected.value && !isLoading.value && !isSpeaking.value) {
    // Only reset to idle if user is not currently speaking
    console.log('VoiceAgent: TTS ended - switching to idle mode for VoiceAgentX');
    currentMode.value = 'idle';
    voiceStatus.value = 'Waiting for speech...';
    isProcessing.value = false;
    currentAudioLevel.value = 0;
  } else if (isSpeaking.value) {
    console.log('VoiceAgent: TTS ended but user is speaking - staying in input mode');
  }
});

// Watch for actual audio playback start for precise animation timing
watch(() => composableAudioStarted.value, (audioStarted) => {
  console.log('VoiceAgent: Audio started state changed:', audioStarted);
  if (audioStarted) {
    console.log('VoiceAgent: Audio playback started - beginning VoiceAgentX animation');
    
    // Simulate audio levels during TTS playback for VoiceAgentX animation
    const simulateAudioLevels = () => {
      if (composableAudioStarted.value && composableIsPlayingTTS.value) {
        // Generate realistic audio level simulation with varied patterns
        const time = Date.now() * 0.005;
        const baseLevel = 0.4;
        const variation = Math.sin(time) * 0.3 + Math.sin(time * 1.7) * 0.2;
        const randomNoise = (Math.random() - 0.5) * 0.15;
        currentAudioLevel.value = Math.max(0.1, Math.min(0.9, baseLevel + variation + randomNoise));
        requestAnimationFrame(simulateAudioLevels);
      } else {
        console.log('VoiceAgent: Audio ended - stopping animation');
        currentAudioLevel.value = 0;
      }
    };
    simulateAudioLevels();
  } else {
    console.log('VoiceAgent: Audio stopped - resetting audio level');
    currentAudioLevel.value = 0;
  }
});

// Debug watcher for mode changes
watch(() => currentMode.value, (newMode, oldMode) => {
  console.log('VoiceAgent: Mode changed from', oldMode, 'to', newMode, '- VoiceAgentX should flip');
});

// Use the loading state from composable to update processing status
watch(isLoading, (newLoading) => {
  console.log('VoiceAgent: Loading state changed:', newLoading);
  
  if (newLoading) {
    console.log('VoiceAgent: Setting status to "AI is thinking..."');
    voiceStatus.value = 'AI is thinking...';
    isProcessing.value = true;
  } else if (isConnected.value) {
    console.log('VoiceAgent: Loading finished');
    setTimeout(() => {
      if (!isLoading.value) {
        console.log('VoiceAgent: Resetting to "Waiting for speech..."');
        voiceStatus.value = 'Waiting for speech...';
        isProcessing.value = false;
        currentMode.value = 'idle';
      }
    }, 200);
  }
});

// Audio and WebRTC
const audioPlayer = ref<HTMLAudioElement | null>(null);
const mediaStream = ref<MediaStream | null>(null);
const audioContext = ref<AudioContext | null>(null);
const analyser = ref<AnalyserNode | null>(null);
const processor = ref<ScriptProcessorNode | null>(null);
const vadBuffer = ref<Float32Array[]>([]);
const silenceTimeout = ref<NodeJS.Timeout | null>(null);
const speechBuffer = ref<Float32Array[]>([]);

// Text input
const textInput = ref('');

// Voice Activity Detection parameters - Optimized for low latency
const VAD_THRESHOLD = 0.04; // Less sensitive to background noise/keyboard
const SILENCE_DURATION = 3500; // Keep as is
const MIN_SPEECH_DURATION = 700; // Require at least 700ms of speech
const BUFFER_SIZE = 1024; // Smaller buffer for lower latency. Alternatively 2048

// Voice Activity Detection
const detectVoiceActivity = (audioData: Float32Array): boolean => {
  const rms = Math.sqrt(audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length);
  return rms > VAD_THRESHOLD;
};

// Process audio for VAD and streaming
const processAudioData = (audioData: Float32Array, level: number) => {
  vadBuffer.value.push(audioData);
  
  // Update visual audio level and mode
  currentAudioLevel.value = Math.min(level * 10, 1);
  
  if (currentMode.value === 'output') {
    currentAudioLevel.value = 0; // Keep the visualizer quiet while AI speaks
    return;
  }
  
  // Keep only recent audio (last 1 second for faster processing)
  if (vadBuffer.value.length > (16000 / BUFFER_SIZE) * 1) {
    vadBuffer.value.shift();
  }
  
  const isSpeakingNow = detectVoiceActivity(audioData);
  
  if (isSpeakingNow) {
    if (!isSpeaking.value) {
      // Start of speech detected - interrupt any ongoing TTS
      isSpeaking.value = true;
      
      // Stop TTS immediately when user starts speaking
      if (composableIsPlayingTTS.value) {
        console.log('VoiceAgent: User speech detected - stopping TTS');
        composableStopTTS();
      }
      
      // Switch to input mode and update VoiceAgentX
      console.log('VoiceAgent: Switching to input mode for user speech');
      currentMode.value = 'input'; // This should trigger VoiceAgentX flip
      voiceStatus.value = 'Listening...';
      
      // Force update to ensure VoiceAgentX receives the mode change
      nextTick(() => {
        console.log('VoiceAgent: Mode update forced, currentMode:', currentMode.value);
      });
      
      speechBuffer.value = [...vadBuffer.value]; // Include pre-speech audio
      // --- Start high-quality WAV recording in sync with speech ---
      // if (!wavRecorder.isRecording.value && totalWavDuration < 30) {
      //   wavRecorder.start()
      // }
    } else {
      // Continue speech
      speechBuffer.value.push(audioData);
    }
    
    // Clear silence timeout
    if (silenceTimeout.value) {
      clearTimeout(silenceTimeout.value);
      silenceTimeout.value = null;
    }
  } else if (isSpeaking.value) {
    // Silence detected during speech
    speechBuffer.value.push(audioData);
    
    if (!silenceTimeout.value) {
      silenceTimeout.value = setTimeout(() => {
        // End of speech detected
        isSpeaking.value = false;
        currentMode.value = 'idle'; // Return to idle
        currentAudioLevel.value = 0;
        voiceStatus.value = 'Processing...';
        sendAudioToServer();
        speechBuffer.value = [];
        silenceTimeout.value = null;
        // --- Stop WAV recording when speech ends ---
        // if (wavRecorder.isRecording.value) {
        //   wavRecorder.stop().then(async (blob) => {
        //     if (blob && totalWavDuration < 30) {
        //       // Estimate duration from blob size (44.1kHz mono 16-bit PCM)
        //       const durationSec = blob.size / (44100 * 2);
        //       if (totalWavDuration + durationSec <= 30) {
        //         // Upload WAV to voice-clone-samples bucket
        //         const formData = new FormData();
        //         formData.append('audio', blob, 'voice-clone.wav');
        //         await fetch('/api/voice/clone-upload', { method: 'POST', body: formData });
        //         totalWavDuration += durationSec;
        //       }
        //     }
        //   })
        // }
      }, SILENCE_DURATION);
    }
  } else {
    // No speaking, gradually reduce audio level
    currentAudioLevel.value *= 0.95;
    if (currentAudioLevel.value < 0.01) {
      currentAudioLevel.value = 0;
      if (currentMode.value === 'input') {
        currentMode.value = 'idle';
      }
    }
  }
};

// Send accumulated audio to server
const sendAudioToServer = async () => {
  // Check if user is authenticated
  const user = useSupabaseUser();
  if (!user.value) {
    console.error('Cannot process audio: User not authenticated');
    voiceStatus.value = 'Please log in to use voice features';
    currentMode.value = 'idle';
    currentAudioLevel.value = 0;
    isProcessing.value = false;
    return;
  }

  const currentSessionCounter = sessionCounter.value; // Use local sessionCounter for current operation
  if (speechBuffer.value.length === 0 || isProcessing.value) return;
  
  // Check minimum duration
  const duration = (speechBuffer.value.length * BUFFER_SIZE) / (audioContext.value?.sampleRate || 16000);
  if (duration < MIN_SPEECH_DURATION / 1000) {
    voiceStatus.value = 'Waiting for speech...';
    return;
  }
  
  try {
    isProcessing.value = true;
    voiceStatus.value = 'Converting speech...';
    
    // Mark user interaction for TTS
    // User interaction is implicit when using voice

    // Convert audio buffer to WAV blob
    const audioBlob = await createWavBlob(speechBuffer.value);
    
    // Send to STT
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    
    const sttResponse = await fetch('/api/voice/stt', {
      method: 'POST',
      body: formData
    });
    
    if (!sttResponse.ok) {
      const errorText = await sttResponse.text();
      console.error('STT request failed:', sttResponse.status, errorText);
      throw new Error('Speech recognition failed');
    }
    
    const { text: transcript } = await sttResponse.json();
    if (!transcript?.trim()) {
      voiceStatus.value = 'No speech detected, try again...';
      isProcessing.value = false; // Reset processing state
      setTimeout(() => {
        voiceStatus.value = 'Waiting for speech...';
      }, 2000);
      return;
    }
    
    voiceStatus.value = 'Sending to AI...';
    
    // Use handleSubmit from composable which will push the message and call sendMessage
    // Note: isProcessing will be managed by the isLoading watcher
    handleSubmit(transcript);
    
  } catch (err: any) {
    console.error('Voice processing error:', err);
    voiceStatus.value = 'Error occurred, try again...';
    currentMode.value = 'idle';
    currentAudioLevel.value = 0;
    isProcessing.value = false; // Unlock on error
    setTimeout(() => {
      voiceStatus.value = 'Waiting for speech...';
    }, 3000);
  }
};

// Create WAV blob from audio buffer
const createWavBlob = async (audioBuffers: Float32Array[]): Promise<Blob> => {
  const sampleRate = audioContext.value?.sampleRate || 16000;
  
  // Filter out empty or invalid buffers
  const validBuffers = audioBuffers.filter(buffer => buffer && buffer.length > 0);
  if (validBuffers.length === 0) {
    throw new Error('No valid audio data to process');
  }
  
  // Calculate actual total length from all valid buffers
  const totalLength = validBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const wavBuffer = new ArrayBuffer(44 + totalLength * 2);
  const view = new DataView(wavBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalLength * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, totalLength * 2, true);
  
  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (const buffer of validBuffers) {
    for (let i = 0; i < buffer.length; i++) {
      if (offset + 2 > wavBuffer.byteLength) {
        console.warn('WAV buffer overflow, truncating audio');
        break;
      }
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    if (offset + 2 > wavBuffer.byteLength) break;
  }
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
};

// Start voice streaming
const startVoiceStream = async () => {
  // Check if user is authenticated
  const user = useSupabaseUser();
  if (!user.value) {
    console.error('Cannot start voice agent: User not authenticated');
    voiceStatus.value = 'Please log in to use voice features';
    return;
  }

  sessionCounter.value++;
  const currentSessionCounter = sessionCounter.value; // Capture current session counter

  try {
    isProcessing.value = true;
    voiceStatus.value = 'Requesting microphone access...';
    micError.value = null; // Clear previous error
    // Get microphone access with optimized settings for low latency
    mediaStream.value = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000, // Lower sample rate for faster processing
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        latency: 0.01 // Request lowest possible latency
      }
    });
    
    // Setup audio context with low latency settings
    audioContext.value = new AudioContext({ 
      sampleRate: 16000,
      latencyHint: 'interactive' // Optimize for low latency
    });
    const source = audioContext.value.createMediaStreamSource(mediaStream.value);
    
    // Setup analyser for level monitoring
    analyser.value = audioContext.value.createAnalyser();
    analyser.value.fftSize = 256;
    source.connect(analyser.value);
    
    // Setup AudioWorklet for VAD
    await audioContext.value.audioWorklet.addModule('/voice-recorder.worklet.js');
    processor.value = new AudioWorkletNode(audioContext.value, 'voice-recorder-worklet');
    
    processor.value.port.onmessage = (event) => {
      if (event.data.type === 'audio-data') {
        const audioData = event.data.data;
        const level = event.data.level;
        
        // Update audio level for visualization
        audioLevel.value = Math.min(level * 10, 1); // Scale the level appropriately
        
        // Process audio data for VAD
        processAudioData(audioData, level);
      }
    };
    
    source.connect(processor.value);
    processor.value.connect(audioContext.value.destination);
    
    isConnected.value = true;
    voiceStatus.value = 'Getting initial message...';
    
    // Ensure TTS is enabled for VoiceAgent
    console.log('VoiceAgent: Enabling composable TTS on connection');
    composableTTSEnabled.value = true;
    
    // Get initial greeting message (from composable) only if not already initialized
    if (!hasInitialized.value) {
      hasInitialized.value = true;
      try {
        await getComposableInitialMessage();
        // Reset processing state after initial message is handled
        voiceStatus.value = 'Waiting for speech...';
        isProcessing.value = false;
      } catch (error) {
        console.error('Error getting initial message:', error);
        voiceStatus.value = 'Ready to chat! You can speak or type.';
        isProcessing.value = false;
      }
    } else {
      // If already initialized, just set to ready state
      voiceStatus.value = 'Waiting for speech...';
      isProcessing.value = false;
    }
    
  } catch (err: any) {
    console.error('Failed to start voice stream:', err);
    // Detect permission denied
    if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
      micError.value = 'Microphone access was denied. Please allow access in your browser settings and try again.';
      voiceStatus.value = 'Microphone access denied.';
    } else if (err && err.name === 'NotFoundError') {
      micError.value = 'No microphone was found. Please connect a microphone and try again.';
      voiceStatus.value = 'No microphone found.';
    } else {
      micError.value = 'Failed to access microphone. Please check your browser settings and try again.';
      voiceStatus.value = 'Failed to access microphone.';
    }
    isProcessing.value = false; // Unlock on error
  }
};

// Stop voice streaming
const stopVoiceStream = () => {
  // Stop TTS if playing
  if (typeof composableStopTTS === 'function') {
    composableStopTTS();
  }
  sessionCounter.value++; // Invalidate current session to cancel pending operations
  isConnected.value = false;
  isSpeaking.value = false;
  voiceStatus.value = 'Click "Start Voice Agent" to begin';
  
  // Cancel any ongoing processing
  isProcessing.value = false;
  
  // Stop audio playback
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    audioPlayer.value.src = '';
  }
  
  // Clear timeouts
  if (silenceTimeout.value) {
    clearTimeout(silenceTimeout.value);
    silenceTimeout.value = null;
  }
  
  // Stop audio context
  if (processor.value) {
    processor.value.disconnect();
    processor.value = null;
  }
  
  if (audioContext.value) {
    audioContext.value.close();
    audioContext.value = null;
  }
  
  // Stop media stream
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop());
    mediaStream.value = null;
  }
  
  // Reset buffers and state
  vadBuffer.value = [];
  speechBuffer.value = [];
  audioLevel.value = 0;
  currentAudioLevel.value = 0;
  currentMode.value = 'idle';
  messages.value = []; // Clear conversation history through composable
};

// Toggle connection
const toggleConnection = () => {
  if (isConnected.value) {
    stopVoiceStream();
  } else {
    startVoiceStream();
  }
};

// Add pause functionality
const pauseVoiceAgent = () => {
  if (isConnected.value) {
    // Stop the voice agent completely and cancel operations
    stopVoiceStream();
  }
};

// For standalone VoiceAgent usage
const voiceAgent = useVoiceAgent();

const wavRecorder = useWavRecorder();

// Enable TTS by default for VoiceAgent
onMounted(() => {
  console.log('VoiceAgent: Component mounted, setting up TTS');
  // Enable composable's TTS for VoiceAgent
  composableTTSEnabled.value = true;
  console.log('VoiceAgent: Composable TTS enabled for voice agent');
  // Trigger initial render
  nextTick(() => {
    forceReinitCounter.value += 1;
  });
  // If using useVoiceAgent directly, trigger initial message
  if (voiceAgent.messages.value.length === 0) {
    voiceAgent.getInitialMessage();
  }
});

// File upload functions
const triggerFileUpload = () => {
  fileInput.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  isUploadingFile.value = true;
  uploadError.value = null;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await $fetch<{ url: string }>('/api/upload/temp', {
      method: 'POST',
      body: formData,
    });
    
    // Create a message about the uploaded file and send it to the AI via voice processing
    const fileMessage = `I have just uploaded a file. You can find it at this URL: ${response.url}. Please ask me for any context you need to categorize it.`;
    
    // Send the file context message through the voice chat system
    handleSubmit(fileMessage);
    
    voiceStatus.value = 'File uploaded successfully';
    
  } catch (e: any) {
    console.error('Upload error:', e);
    uploadError.value = e.data?.message || e.message || 'The file could not be uploaded. Please try again.';
  } finally {
    isUploadingFile.value = false;
    // Reset file input so the user can upload the same file again
    if (target) target.value = '';
  }
};

// Text input handler
const handleTextInput = async () => {
  if (!textInput.value.trim()) return;
  const message = textInput.value.trim();
  textInput.value = '';
  
  // Stop TTS immediately when user submits text input
  if (composableIsPlayingTTS.value) {
    console.log('VoiceAgent: Text input submitted - stopping TTS');
    composableStopTTS();
  }
  
  // The message will be added to the history inside handleSubmit
  handleSubmit(message);
};

// Get initial message from AI
const getInitialMessage = async () => {
  // Only initialize if not already initialized and no messages are present (fresh start)
  if (!hasInitialized.value && messages.value.length === 0) {
    hasInitialized.value = true;
    getComposableInitialMessage();
  }
};

// Cleanup on unmount
onUnmounted(() => {
  stopVoiceStream();
  
  // Clean up TTS audio
  // cleanupTTSAudio(); // This function is no longer needed
  
  // Reset initialization state
  hasInitialized.value = false;
});

// Cleanup function to stop TTS, message generation, voice streaming, and reset state
function cleanup() {
  // Stop TTS if playing (composable should provide stopTTS if needed)
  if (typeof isPlayingTTS !== 'undefined') isPlayingTTS.value = false;
  if (typeof isLoading !== 'undefined') isLoading.value = false;
  // If composable provides stopTTS, call it
  if (typeof composableStopTTS === 'function') {
    composableStopTTS();
  }
  // Stop voice stream and audio context
  stopVoiceStream();
  // Optionally clear messages for a fresh session
  // messages.value = [];
  // Reset upload state
  isUploadingFile.value = false;
  uploadError.value = null;
}
defineExpose({ cleanup });

// Retry microphone access
const retryMicAccess = async () => {
  micError.value = null;
  await startVoiceStream();
};
</script>

<style scoped>
/* Minimal styles */
</style> 