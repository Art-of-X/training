<template>
  <div :class="embedded ? 'h-full' : 'py-8 container-wide'">
    <div v-if="!embedded" class="flex flex-col h-[75vh] bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-sm">
      <header class="p-4 border-b border-secondary-200 dark:border-secondary-700">
        <h1 class="text-xl font-bold text-secondary-900 dark:text-white">AI Chat</h1>
      </header>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-for="(message, index) in messages" :key="index" :class="message.role === 'user' ? 'flex justify-end' : 'flex'">
          <div
            class="p-3 rounded-lg max-w-lg"
            :class="message.role === 'user' ? 'bg-primary-500 text-white' : 'bg-secondary-200 dark:bg-secondary-700'"
          >
            <p v-if="message.content" class="whitespace-pre-wrap">{{ message.content }}</p>
            <div v-else class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
        <div v-if="error" class="text-red-500">
          <p>An error occurred: {{ error.message }}</p>
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
    <div v-else class="flex flex-col h-full max-w-4xl mx-auto w-full">
      
      <!-- Chat messages -->
      <div 
        ref="chatContainer"
        class="flex-grow overflow-y-auto mb-4 text-base"
        style="scroll-behavior: smooth;"
      >
        <div v-for="(message, index) in messages" :key="index" 
             :class="['mb-4', message.role === 'user' ? 'text-right' : 'text-left']">
          <div :class="['inline-block py-2 px-3 rounded-lg max-w-[80%]', 
                        message.role === 'user' 
                          ? 'bg-secondary-500 text-white' 
                          : 'bg-primary-500 text-white']">
             <p v-if="message.content" class="whitespace-pre-wrap">{{ message.content }}</p>
             <!-- This is the "thinking" indicator -->
             <div v-else class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
        
        <!-- Loading animation for the very first message -->
        <div v-if="isLoading && messages.length === 0" class="mb-4 text-left">
          <div class="inline-block py-2 px-3 rounded-lg max-w-[80%] bg-primary-500 text-white">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
        
        <!-- Error message -->
        <div v-if="error" class="mb-4 text-center text-red-500">
          {{ error.message }}
        </div>
         <!-- Upload Progress Indicator -->
        <div v-if="isUploadingFile" class="mb-4 text-left">
           <div class="inline-block py-2 px-3 rounded-lg max-w-[80%] bg-secondary-200 dark:bg-secondary-700">
             <div class="flex items-center space-x-2 text-sm">
                <div class="loading-spinner-sm"></div>
                <span>Uploading file...</span>
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
            :disabled="isLoading || isUploadingFile"
            class="p-2 rounded-full text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Upload a file"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
          </button>
          <input 
            v-model="inputValue"
            @keyup.enter="handleSubmitWithScroll"
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
  </div>
</template>

<script setup lang="ts">
import { useChat } from '~/composables/useChat';
import { onMounted, ref, watch, nextTick } from 'vue';

// Props
interface Props {
  embedded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  embedded: false
});

const { messages, handleSubmit, isLoading, error, getInitialMessage } = useChat();

const inputValue = ref('');
const chatContainer = ref<HTMLElement | null>(null);

// File upload state
const fileInput = ref<HTMLInputElement | null>(null);
const isUploadingFile = ref(false);
const uploadError = ref<string | null>(null);

const triggerFileUpload = () => {
  fileInput.value?.click();
};

const handleProactiveFileUpload = async (event: Event) => {
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
        
        // Use the returned temporary URL to start the conversation
        const message = `I have just uploaded a file. You can find it at this URL: ${response.url}. Please ask me for any context you need to categorize it.`;
        await handleSubmit(message);

    } catch (e: any) {
        uploadError.value = e.data?.message || 'The file could not be uploaded. Please try again.';
    } finally {
        isUploadingFile.value = false;
        // Reset file input so the user can upload the same file again
        if (target) target.value = '';
    }
};

// Auto-scroll to bottom function
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

// Watch for changes that should trigger scrolling
watch(messages, () => scrollToBottom(), { deep: true });

// Enhanced submit handler with auto-scroll
const handleSubmitWithScroll = async (e: Event) => {
  e.preventDefault();
  if (!inputValue.value.trim()) return;
  
  await handleSubmit(inputValue.value);

  inputValue.value = '';
  
  scrollToBottom();
};

onMounted(() => {
  getInitialMessage();
  scrollToBottom();
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

/* Remove old typing indicator styles */
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