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
            <p v-if="message.content">{{ message.content }}</p>
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
            v-model="input"
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
    <div v-else class="flex flex-col h-full min-h-0">
      
      <!-- Chat messages -->
      <div 
        ref="chatContainer"
        class="flex-1 overflow-y-auto mb-4 text-xl min-h-0"
        style="scroll-behavior: smooth;"
      >
        <div v-for="(message, index) in messages" :key="index" 
             :class="['mb-4', message.role === 'user' ? 'text-right' : 'text-left']">
          <div :class="['inline-block py-2 px-3 max-w-[80%] text-white', 
                        message.role === 'user' 
                          ? 'bg-secondary-500' 
                          : 'bg-primary-500']">
            {{ message.content }}
          </div>
        </div>
        
        <!-- Typing indicator -->
        <div v-if="isTyping" class="mb-4 text-left">
          <div class="inline-block py-2 px-3 max-w-[80%] text-white bg-primary-500">
            {{ currentTypingMessage }}<span class="typing-cursor">|</span>
          </div>
        </div>
        
        <!-- Loading animation -->
        <div v-if="isLoading" class="mb-4 text-left">
          <div class="spinning-x mx-auto text-primary-500">
            ✕
          </div>
        </div>
        
        <!-- Error message -->
        <div v-if="error" class="mb-4 text-center text-red-500">
          {{ error.message }}
        </div>
      </div>
      
      <!-- Input area - always visible -->
      <div class="flex-shrink-0 sticky bottom-0 bg-white dark:bg-secondary-900 py-2">
        <form @submit.prevent="handleSubmitWithScroll" class="flex">
          <input 
            v-model="input"
            type="text"
            placeholder="Type your message..."
            class="w-full px-3 py-2 border-2 border-secondary-300 dark:border-secondary-600 text-xl focus:outline-none me-4 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white"
            :disabled="isLoading || isTyping"
          />
          <button 
            type="submit"
            class="py-2 px-6 text-xl text-white whitespace-nowrap min-w-fit bg-primary-500 hover:bg-primary-600 disabled:opacity-70"
            :disabled="isLoading || isTyping"
          >
            Send
          </button>
        </form>
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

const { messages, input, handleSubmit, isLoading, error } = useChat();

// Additional state for playground-style features
const isTyping = ref(false);
const currentTypingMessage = ref('');
const chatContainer = ref<HTMLElement | null>(null);

// Auto-scroll to bottom function
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

// More aggressive auto-scroll
const forceScrollToBottom = () => {
  // Immediate scroll
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
  // Also scroll in next tick for DOM updates
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
  // And scroll again after a short delay to catch any late updates
  setTimeout(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  }, 100);
};

// Watch for changes that should trigger scrolling
watch(() => messages.value.length, forceScrollToBottom);
watch(isTyping, forceScrollToBottom);
watch(currentTypingMessage, forceScrollToBottom);
watch(isLoading, forceScrollToBottom);
watch(input, scrollToBottom); // Scroll when user types

// Enhanced submit handler with auto-scroll
const handleSubmitWithScroll = async (e: Event) => {
  await handleSubmit(e);
  forceScrollToBottom();
};

onMounted(() => {
  if (messages.value.length === 0) {
    messages.value.push({
      role: 'assistant',
      content: 'Hello! I am your creative assistant. How can I help you with your portfolio or creative benchmarks today?'
    });
  }
  forceScrollToBottom();
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
</style> 