<template>
  <div :class="embedded ? 'h-full' : 'py-8 container-wide'">
    <div v-if="!embedded" class="flex flex-col h-[75vh] bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-sm">
      <header class="p-4 border-b border-secondary-200 dark:border-secondary-700">
        <h1 class="text-xl font-bold text-secondary-900 dark:text-white">AI Chat</h1>
      </header>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-for="(message, index) in displayMessages" :key="index" :class="message.role === 'user' ? 'flex justify-end' : 'flex'">
          <div v-if="message.role !== 'user'" class="flex-shrink-0 w-16 h-16 flex items-center justify-center mr-2 overflow-hidden">
            <DashboardX class="w-full h-full" />
          </div>
          <div
            class="p-3 rounded-lg max-w-lg"
            :class="message.role === 'user' ? 'bg-primary-500 text-white' : 'bg-secondary-200 dark:bg-secondary-700'"
          >
            <div v-if="Array.isArray(message.content)">
              <div v-for="(part, partIndex) in message.content" :key="partIndex">
                <p v-if="part.type === 'text'" class="whitespace-pre-wrap">{{ part.text }}</p>
                <img v-else-if="part.type === 'image'" :src="part.image" class="max-w-xs h-auto rounded-lg my-2" />
                <a v-else-if="part.type === 'file'" :href="part.url" target="_blank" class="text-primary-300 hover:underline flex items-center">
                  <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.123l-3.397 3.396m0 0l-3.397-3.396M11.355 14.519V3m0 11.519c-4.482 0-8.123 3.641-8.123 8.123C3.232 20.402 7.89 24 12.752 24c4.861 0 9.519-3.598 9.519-9.519 0-4.482-3.641-8.123-8.123-8.123z"></path></svg>
                  {{ part.fileName || 'Uploaded File' }} ({{ part.mimeType }})
                </a>
              </div>
            </div>
            <p v-else-if="message.content" class="whitespace-pre-wrap">{{ message.content }}</p>
            <div v-else class="flex items-center space-x-1">
              <span>Thinking</span><span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        </div>
      </div>
      <footer class="p-4 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900/50 rounded-b-lg">
        <form @submit.prevent="handleSubmitWithScroll" class="flex items-center space-x-2">
          <input
            v-model="inputValue"
            @keyup.enter="handleSubmitWithScroll"
            type="text"
            placeholder="Type your message..."
            class="flex-1 p-2 border rounded-lg bg-white dark:bg-secondary-800 dark:border-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            :disabled="isLoading"
          />
          <button type="submit" class="btn-primary" :disabled="isLoading">
            {{ isLoading ? 'Sending...' : 'Send' }}
          </button>
        </form>
      </footer>
    </div>
    
    <!-- Embedded Chat (playground style) -->
    <div v-else class="flex flex-col h-full w-full">
      <div class="flex justify-end mb-2">
        <button @click="showHistoryModal = true" class="btn-secondary text-sm px-3 py-1">View History</button>
      </div>
      
      <!-- Chat messages -->
      <div 
        ref="chatContainer"
        class="flex-grow overflow-y-auto mb-4 text-base"
        style="scroll-behavior: smooth;"
      >
        <div v-for="(message, index) in displayMessages" :key="index" 
             :class="['mb-4 flex', message.role === 'user' || message.role === 'recording' ? 'justify-end' : 'justify-start']">
          <div v-if="message.role !== 'user' && message.role !== 'recording'" class="flex-shrink-0 w-16 h-16 flex items-center justify-center mr-2 overflow-hidden">
            <DashboardX class="w-full h-full" />
          </div>
          <div :class="['inline-block py-2 px-3 rounded-lg max-w-[80%]', 
                        message.role === 'user' 
                          ? 'bg-secondary-500 text-white' 
                          : message.role === 'recording'
                          ? 'bg-secondary-500 text-white'
                          : 'bg-primary-500 text-white']">
             <div v-if="message.role === 'recording'" class="whitespace-pre-wrap">{{ message.content }}</div>
             <div v-else-if="Array.isArray(message.content)">
              <div v-for="(part, partIndex) in message.content" :key="partIndex">
                <p v-if="part.type === 'text'" class="whitespace-pre-wrap">{{ part.text }}</p>
                <img v-else-if="part.type === 'image'" :src="part.image" class="max-w-xs h-auto rounded-lg my-2" />
                <a v-else-if="part.type === 'file'" :href="part.url" target="_blank" class="text-primary-300 hover:underline flex items-center">
                  <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.123l-3.397 3.396m0 0l-3.397-3.396M11.355 14.519V3m0 11.519c-4.482 0-8.123 3.641-8.123 8.123C3.232 20.402 7.89 24 12.752 24c4.861 0 9.519-3.598 9.519-9.519 0-4.482-3.641-8.123-8.123-8.123z"></path></svg>
                  {{ part.fileName || 'Uploaded File' }} ({{ part.mimeType }})
                </a>
              </div>
            </div>
             <p v-else-if="message.content" class="whitespace-pre-wrap">{{ message.content }}</p>
             <!-- This is the "thinking" indicator -->
             <div v-else class="flex items-center space-x-1 text-white">
              <span>Thinking</span><span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        </div>
        
        <!-- Loading animation for the very first message -->
        <div v-if="isLoading && messages.length === 0" class="mb-4 flex justify-start">
          <div class="flex-shrink-0 w-16 h-16 flex items-center justify-center mr-2 overflow-hidden">
            <DashboardX class="w-full h-full" />
          </div>
          <div class="inline-block py-2 px-3 rounded-lg max-w-[80%] bg-primary-500 text-white">
            <div class="flex items-center space-x-1">
              <span>Thinking</span><span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        </div>
        
        <!-- Error message -->
        <div v-if="error" class="mb-4 text-center text-red-500">
          {{ error.message }}
        </div>
         <!-- Upload Progress Indicator -->
        <div v-if="isUploadingFile" class="mb-4 flex justify-start">
          <div class="flex-shrink-0 w-16 h-16 flex items-center justify-center mr-2 overflow-hidden">
            <DashboardX class="w-full h-full" />
          </div>
          <div class="inline-block py-2 px-3 rounded-lg max-w-[80%] bg-primary-500 text-white">
            <div class="flex items-center space-x-1">
              <span>Thinking</span><span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Input area - always visible -->
      <div class="flex-shrink-0">
        <form @submit.prevent="handleSubmitWithScroll" class="flex items-center space-x-2 p-1 border rounded-lg bg-white dark:bg-secondary-800 dark:border-secondary-600 focus-within:ring-2 focus-within:ring-primary-500">
          <input 
            type="file" 
            ref="fileInput" 
            @change="handleProactiveFileUpload" 
            class="hidden" 
          />
          <button
            type="button"
            @click="triggerFileUpload"
            @focus="initializeChat"
            :disabled="isLoading || isUploadingFile"
            class="p-2 rounded-full text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Upload a file"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
          </button>
          
          <!-- Voice Controls -->
          <!-- Microphone button -->
          <button
            type="button"
            @click="isRecording ? stopRecording() : startRecording()"
            @focus="initializeChat"
            :disabled="isLoading || isUploadingFile"
            :class="[
              'p-2 rounded-full focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700'
            ]"
            aria-label="Toggle voice recording"
          >
            <svg v-if="!isRecording" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
            <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"></path>
            </svg>
          </button>
          
          <!-- Speaker button -->
          <button
            type="button"
            @click="toggleTTS"
            @focus="initializeChat"
            :disabled="isLoading || isUploadingFile"
            :class="[
              'p-2 rounded-full focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              isTTSEnabled 
                ? 'bg-primary-500 text-white' 
                : 'text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700'
            ]"
            aria-label="Toggle text-to-speech"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12H7a1 1 0 01-1-1v-2a1 1 0 011-1h2l3.464-2.464A1 1 0 0114 6v12a1 1 0 01-1.536.844L9 16z"></path>
            </svg>
          </button>
          
          <input 
            v-model="inputValue"
            @keyup.enter="handleSubmitWithScroll"
            @focus="initializeChat"
            type="text"
            placeholder="Type your message..."
            class="flex-1 w-full px-2 py-2 bg-transparent focus:outline-none dark:text-white"
            :disabled="isLoading"
          />
          <button 
            type="submit"
            class="btn-primary"
            :disabled="isLoading || !inputValue.trim()"
          >
            Send
          </button>
        </form>
         <p v-if="uploadError" class="text-xs text-red-500 mt-1 pl-2">{{ uploadError }}</p>
      </div>
    </div>

    <!-- History Modal -->
    <ChatHistoryModal
      :show="showHistoryModal"
      :loading="loadingHistory"
      :error="historyError"
      :groupedHistory="groupedHistory"
      @close="showHistoryModal = false"
      @loadSession="loadSession"
    />
  </div>
</template>

<script setup lang="ts">
import { useChat } from '~/composables/useChat';
import { onMounted, onUnmounted, ref, watch, nextTick, computed, defineExpose } from 'vue';
import DashboardX from '~/components/DashboardX.vue';
import ChatHistoryModal from '~/components/ChatHistoryModal.vue'

// Props
interface Props {
  embedded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  embedded: false
});

const { 
  messages, 
  handleSubmit: originalHandleSubmit, 
  isLoading, 
  error, 
  getInitialMessage,
  // Voice functionality
  isRecording,
  isTTSEnabled: composableTTSEnabled,
  startRecording: originalStartRecording,
  stopRecording: originalStopRecording,
  toggleTTS: toggleComposableTTS,
  loadSession: loadComposableSession, // Add loadSession to the composable
  getInitialMessage: getComposableInitialMessage, // Add getInitialMessage to the composable
  currentSessionId // Add currentSessionId to the composable
} = useChat();

// TTS state - use composable's TTS instead of custom implementation
// const isTTSEnabled = ref(true);
// const isPlayingTTS = ref(false);  
// const currentAudio = ref<HTMLAudioElement | null>(null);

// Use composable's TTS system
const isTTSEnabled = composableTTSEnabled;
const isPlayingTTS = ref(false); // Keep for compatibility

// State to track if initial message has been sent
const hasInitialized = ref(false);

// Disable composable's TTS to prevent conflicts
watch(composableTTSEnabled, (newVal) => {
  console.log('Chat: Composable TTS enabled changed to:', newVal);
  // Don't disable - let it work naturally
}, { immediate: true });

// Clean up audio - using composable's TTS now
const cleanupAudio = () => {
  // No-op since we're using composable's TTS
  console.log('Chat: cleanupAudio called - using composable TTS');
};

// Our own TTS toggle function - now just toggles the composable's TTS
const toggleTTS = () => {
  console.log('Chat: Toggling composable TTS');
  toggleComposableTTS();
};

const inputValue = ref('');
const chatContainer = ref<HTMLElement | null>(null);

// File upload state
const fileInput = ref<HTMLInputElement | null>(null);
const isUploadingFile = ref(false);
const uploadError = ref<string | null>(null);

// Custom voice functions that use our message handling
const mediaRecorder = ref<MediaRecorder | null>(null);
const audioChunks = ref<Blob[]>([]);

// Recording timer state
const recordingTime = ref(0);
const recordingTimer = ref<NodeJS.Timeout | null>(null);

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

const showHistoryModal = ref(false);
const chatHistory = ref<ChatSession[]>([]);
const loadingHistory = ref(false);
const historyError = ref<Error | null>(null);

// Group history by date and show session titles
const groupedHistory = computed(() => {
  const groups: { [key: string]: { id: string; title: string; time: string; messageCount: number; messages: { role: string; content: string }[] }[] } = {};
  
  chatHistory.value.forEach(session => {
    const sessionDate = new Date(session.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const sessionTime = new Date(session.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (!groups[sessionDate]) {
      groups[sessionDate] = [];
    }
    
    groups[sessionDate].push({
      id: session.id,
      title: session.title || 'Untitled Chat', // Use session title
      time: sessionTime,
      messageCount: session.chatMessages.length,
      messages: session.chatMessages.map(msg => ({ role: msg.role, content: msg.content }))
    });
  });
  
  // Sort dates descending
  const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const sortedGroups: typeof groups = {};
  sortedDates.forEach(date => {
    sortedGroups[date] = groups[date].sort((a, b) => { // Sort sessions within a day by time (descending)
      const timeA = new Date(`1/1/2000 ${a.time}`).getTime();
      const timeB = new Date(`1/1/2000 ${b.time}`).getTime();
      return timeB - timeA;
    });
  });

  return sortedGroups;
});

const fetchChatHistory = async () => {
  loadingHistory.value = true;
  historyError.value = null;
  try {
    // Fetch all chat sessions with their messages
    const data = await $fetch<ChatSession[]>('/api/chat/history');
    chatHistory.value = data;
  } catch (e: any) {
    historyError.value = e;
    console.error('Failed to fetch chat history:', e);
    // Notify user via assistant message
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I could not load your chat history. Please try again later.'
    });
    scrollToBottom();
  } finally {
    loadingHistory.value = false;
  }
};

const loadSession = async (sessionMessages: { role: string; content: string }[], sessionId: string) => {
  // Stop any ongoing audio playback first
  cleanupAudio();
  // Clear current messages and load selected session using the composable's loadSession
  loadComposableSession(sessionMessages, sessionId); // Call the composable's loadSession
  hasInitialized.value = true; // Mark as initialized to prevent initial message on load
  showHistoryModal.value = false; // Close modal
  await nextTick();
  scrollToBottom();
};

watch(showHistoryModal, (newVal) => {
  if (newVal) {
    fetchChatHistory();
  }
});

const startRecording = async () => {
  try {
    // Check if user is authenticated
    const user = useSupabaseUser();
    if (!user.value) {
      console.error('Cannot start recording: User not authenticated');
      error.value = { message: 'Please log in to use voice features' };
      return;
    }

    // User interaction is implicit when using voice
    
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
      await processVoiceInput(audioBlob);
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
    };
    
    mediaRecorder.value.start();
    isRecording.value = true;
    
    // Start recording timer and add recording message
    recordingTime.value = 0;
    addRecordingMessage();
    recordingTimer.value = setInterval(() => {
      recordingTime.value++;
      updateRecordingMessage();
    }, 1000);
    
  } catch (e) {
    error.value = e;
    console.error('Error starting recording:', e);
  }
};

const stopRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop();
    isRecording.value = false;
    
    // Clean up recording timer and update message to processing
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value);
      recordingTimer.value = null;
    }
    updateRecordingToProcessing();
  }
};

// Helper functions for recording message display
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const addRecordingMessage = () => {
  messages.value.push({
    role: 'recording',
    content: `Recording... ${formatTime(recordingTime.value)}
Press ⏹ to stop`
  });
  scrollToBottom();
};

const updateRecordingMessage = () => {
  const lastMessage = messages.value[messages.value.length - 1];
  if (lastMessage && lastMessage.role === 'recording') {
    // Keep the instruction text but update the time
    lastMessage.content = `Recording... ${formatTime(recordingTime.value)}
Press ⏹ to stop`;
  }
};

const removeRecordingMessage = () => {
  const lastMessage = messages.value[messages.value.length - 1];
  if (lastMessage && lastMessage.role === 'recording') {
    messages.value.pop();
  }
};

const updateRecordingToProcessing = () => {
  const lastMessage = messages.value[messages.value.length - 1];
  if (lastMessage && lastMessage.role === 'recording') {
    lastMessage.content = 'Processing...';
  }
};

const updateRecordingToTranscription = (transcription: string) => {
  const lastMessage = messages.value[messages.value.length - 1];
  if (lastMessage && lastMessage.role === 'recording') {
    lastMessage.content = transcription;
    lastMessage.role = 'user'; // Convert to user message
  }
};

// Process AI response using current messages (for voice input after transcription is already added)
const processAIResponse = async () => {
  // Wait for any previous audio to finish before starting new message
  while (isPlayingTTS.value) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  try {
    isLoading.value = true;
    
    // Always include sessionId in the payload
    const response = await $fetch('/api/chat/message', {
      method: 'POST',
      body: { messages: messages.value, sessionId: currentSessionId.value }
    });
    
    if (response.content) {
      // Process the response with TTS and typing animation
      await processResponseSimple(response.content);
    }
  } catch (e) {
    console.error('Error processing AI response:', e);
    // Notify user via assistant message
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I ran into an error while processing your request.'
    });
    scrollToBottom();
  } finally {
    isLoading.value = false;
  }
};

const processVoiceInput = async (audioBlob: Blob) => {
  try {
    isLoading.value = true;
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    // Include sessionId if available
    if (typeof currentSessionId !== 'undefined' && currentSessionId.value) {
      formData.append('sessionId', currentSessionId.value);
    }
    
    const response = await fetch('/api/voice/stt', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }
    
    const { text } = await response.json();
    
    // Always update the recording message, even if text is empty
    if (text && text.trim()) {
      updateRecordingToTranscription(text.trim());
      await processAIResponse();
    } else {
      // If no text, inform the user
      updateRecordingToTranscription('No speech detected.');
    }
    scrollToBottom(); // Ensure scroll happens after message update

  } catch (e) {
    console.error('Error processing voice input:', e);
    // Remove the message on error, or change to an error message
    removeRecordingMessage(); // Or update with 'Error processing voice input.'
    // Notify user via assistant message
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I could not process your voice input. Please try again.'
    });
    scrollToBottom();
  } finally {
    isLoading.value = false;
  }
};

const triggerFileUpload = () => {
  fileInput.value?.click();
};

const handleProactiveFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    isUploadingFile.value = true;
    uploadError.value = null;
    
    // Safety timeout to reset upload state if it gets stuck
    const uploadTimeout = setTimeout(() => {
        if (isUploadingFile.value) {
            console.warn('Upload timeout - resetting upload state');
            isUploadingFile.value = false;
            uploadError.value = 'Upload timed out. Please try again.';
            // Notify user via assistant message
            messages.value.push({
              role: 'assistant',
              content: 'Sorry, your file upload timed out. Please try again.'
            });
            scrollToBottom();
        }
    }, 120000); // 2 minute safety timeout

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await $fetch<{ url: string }>('/api/upload/temp', {
            method: 'POST',
            body: formData,
            timeout: 30000, // 30 second timeout
        });
        
        // Add a user message showing the file was uploaded
        messages.value.push({
            role: 'user',
            content: `📎 Uploaded: ${file.name}`
        });
        scrollToBottom();
        
        // Process the file in the background
        try {
            console.log('Processing uploaded file:', response.url);
            // Instead of pushing a system message to the UI, just call the AI with the context
            // The system message is only for backend context, not for UI
            const systemMessage = {
                role: 'system' as const,
                content: 'The user has uploaded a document. Please analyze it thoroughly and be prepared to answer questions about it.'
            };
            const userMessageForAI = `I have uploaded a file. Please use the documentProcessing tool to analyze this file: ${response.url}. The context is: user uploaded creative work or portfolio materials.`;

            // Call the AI to process the file, but do not add another user message to the UI
            // Use a custom handleSubmit that does not push a user message, or temporarily remove the last user message if needed
            // Here, we call handleSubmit, but only the agent's response will be shown
            await originalHandleSubmit(userMessageForAI, true);
        } catch (messageError) {
            console.error('Error processing uploaded file:', messageError);
            // Add a message to let user know processing failed
            messages.value.push({
                role: 'assistant',
                content: `I received your file "${file.name}" but had trouble processing it. You can still ask me questions about it or describe what it contains.`
            });
            scrollToBottom();
        }

    } catch (e: any) {
        console.error('Upload error:', e);
        uploadError.value = e.data?.message || e.message || 'The file could not be uploaded. Please try again.';
        // Notify user via assistant message
        messages.value.push({
          role: 'assistant',
          content: 'Sorry, your file could not be uploaded. Please try again.'
        });
        scrollToBottom();
    } finally {
        // Clear the safety timeout
        clearTimeout(uploadTimeout);
        // Ensure the upload indicator is always cleared
        isUploadingFile.value = false;
        // Reset file input so the user can upload the same file again
        if (target) target.value = '';
    }
};



// Simple response processing with unified TTS
const processResponseSimple = async (text: string, isFirstMessage: boolean = false) => {
    // Create ONE message bubble for the entire response
    messages.value.push({
        role: 'assistant',
        content: text // Display the full response immediately
    });
    
    await nextTick();
    scrollToBottom();
    
    // The composable's TTS will handle audio playback automatically if enabled
    console.log('Chat: Message displayed, composable TTS will handle audio if enabled');
};

// Auto-scroll to bottom function
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

// Custom submit handler that handles both text and voice input
const handleSubmitWithScroll = async (e: Event) => {
  e.preventDefault();
  if (!inputValue.value.trim()) return;
  
  // User interaction is implicit when submitting text
  
  const userMessage = inputValue.value;
  inputValue.value = '';
  
  // Use the composable's handleSubmit which properly handles voice input and session ID
  originalHandleSubmit(userMessage);
};

// Removed handleMessage function as its logic is now handled by useChat's handleSubmit

// Custom getInitialMessage function that uses our new approach
const getInitialMessageWithTTS = async () => {
  // Wait for any previous audio to finish before starting
  while (isPlayingTTS.value) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Reset messages for a new chat and let useChat composable handle the initial prompt
  messages.value = []; 
  // Call the getInitialMessage from useChat composable
  await getComposableInitialMessage();
  
  scrollToBottom();
};

// Watch for changes that should trigger scrolling
watch(messages, () => scrollToBottom(), { deep: true });

// Function to initialize chat when it becomes visible
const initializeChat = () => {
  // Only initialize if not already initialized and no messages are present (fresh start)
  if (!hasInitialized.value && messages.value.length === 0) {
    hasInitialized.value = true;
    getComposableInitialMessage(); // Call the composable's initial message function
    scrollToBottom();
  }
};

// Observer to detect when chat becomes visible
const chatObserver = ref<IntersectionObserver | null>(null);

// Filter out system messages and technical user messages for display
const displayMessages = computed(() => {
  // Filter out system messages and technical user messages
  const filtered = messages.value.filter((msg) => {
    if (msg.role === 'system') return false;
    if (msg.role === 'user' && typeof msg.content === 'string') {
      if (msg.content.startsWith('I have uploaded a file. Please use the documentProcessing tool')) return false;
      if (msg.content.trim() === 'The user has uploaded a document. Please analyze it thoroughly and be prepared to answer questions about it.') return false;
    }
    return true;
  });

  // Only show the last assistant placeholder (content === '') if it is the last message
  let lastAssistantPlaceholderIndex = -1;
  for (let i = 0; i < filtered.length; i++) {
    const msg = filtered[i];
    if (msg.role === 'assistant' && msg.content === '') {
      lastAssistantPlaceholderIndex = i;
    }
  }
  return filtered.filter((msg, i) => {
    if (msg.role === 'assistant' && msg.content === '') {
      // Only show if it's the last message in the array
      return i === filtered.length - 1 && i === lastAssistantPlaceholderIndex;
    }
    return true;
  });
});

// Cleanup function to stop TTS, message generation, and reset state
function cleanup() {
  // Stop TTS if playing (composable should provide stopTTS if needed)
  if (typeof isPlayingTTS !== 'undefined') isPlayingTTS.value = false;
  if (typeof isLoading !== 'undefined') isLoading.value = false;
  // If composable provides stopTTS or cancelMessageGen, call them
  if (typeof toggleComposableTTS === 'function' && isTTSEnabled.value) {
    toggleComposableTTS(); // Ensure TTS is off
  }
  // Clear recording timer
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value);
    recordingTimer.value = null;
  }
  // Optionally clear messages for a fresh session
  // messages.value = [];
  // Reset upload state
  isUploadingFile.value = false;
  uploadError.value = null;
}
defineExpose({ cleanup });

onMounted(async () => {
  // Disable composable's TTS by default for Chat
  composableTTSEnabled.value = false;
  console.log('Chat: Composable TTS disabled by default');
  
  // Wait for DOM to be ready
  await nextTick();
  
  if (!props.embedded) {
    // For non-embedded chat (standalone page), initialize immediately
    initializeChat();
    return;
  }
  
  // For embedded chat, set up intersection observer
  const setupObserver = () => {
    if (chatContainer.value) {
      chatObserver.value = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0) {
              initializeChat();
            }
          });
        },
        { threshold: 0.1 } // Trigger when 10% of the component is visible
      );
      
      chatObserver.value.observe(chatContainer.value);
    } else {
      // Fallback: retry after a short delay
      setTimeout(setupObserver, 100);
    }
  };
  
  setupObserver();
});

// Clean up observer and timer on unmount
onUnmounted(() => {
  if (chatObserver.value) {
    chatObserver.value.disconnect();
  }
  
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value);
    recordingTimer.value = null;
  }
  
  // Clean up any remaining audio and blob URLs
  cleanupAudio();
});
</script>

<style scoped>
.spinning-x {
  display: inline-block;
  font-size: 3rem;
  font-weight: bold;
  animation: randomSpin 3s infinite ease-in-out;
  transform-origin: center center;
  perspective: 1000px;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
}

.typing-cursor {
  animation: blink 0.7s infinite;
}

button {
  hyphens: none;
  -webkit-hyphens: none;
  -ms-hyphens: none;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@keyframes randomSpin {
  0% {
    transform: rotate(0deg) rotateX(0deg) rotateY(0deg);
  }
  20% {
    transform: rotate(72deg) rotateX(60deg) rotateY(0deg);
  }
  40% {
    transform: rotate(144deg) rotateX(0deg) rotateY(60deg);
  }
  60% {
    transform: rotate(216deg) rotateX(-30deg) rotateY(30deg);
  }
  80% {
    transform: rotate(288deg) rotateX(45deg) rotateY(-45deg);
  }
  100% {
    transform: rotate(360deg) rotateX(0deg) rotateY(0deg);
  }
}

input:disabled, button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.typing-indicator {
  display: flex;
  padding: 8px;
  align-items: center;
}
.typing-indicator span {
  height: 8px;
  width: 8px;
  background-color: #9E9EA1;
  border-radius: 50%;
  display: inline-block;
  margin: 0 2px;
  animation: wave 1.4s infinite ease-in-out both;
}
.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}
.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}
@keyframes wave {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1.0);
  }
}
.loading-spinner-sm {
  @apply w-4 h-4 border-2 border-gray-300 border-t-primary-600 dark:border-secondary-500 dark:border-t-primary-400 rounded-full animate-spin;
}
</style> 