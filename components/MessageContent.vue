<template>
  <div>
    <div v-if="Array.isArray(message.content)">
      <div v-for="(part, partIndex) in message.content" :key="partIndex">
        <p v-if="part.type === 'text'" class="whitespace-pre-wrap">
          {{ part.text }}
        </p>
        <img
          v-else-if="part.type === 'image'"
          :src="part.image"
          class="max-w-xs h-auto rounded-lg my-2"
        />
        <a
          v-else-if="part.type === 'file'"
          :href="part.url"
          target="_blank"
          class="text-primary-300 hover:underline flex items-center"
        >
          <svg
            class="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M14.752 11.123l-3.397 3.396m0 0l-3.397-3.396M11.355 14.519V3m0 11.519c-4.482 0-8.123 3.641-8.123 8.123C3.232 20.402 7.89 24 12.752 24c4.861 0 9.519-3.598 9.519-9.519 0-4.482-3.641-8.123-8.123-8.123z"
            ></path>
          </svg>
          {{ part.fileName || "Uploaded File" }} ({{ part.mimeType }})
        </a>
      </div>
    </div>
    <div v-else-if="typeof message.content === 'string'" class="markdown-content">
      <div v-if="displayedText !== null" class="whitespace-pre-wrap">
        {{ displayedText }}
      </div>
      <div v-else v-html="renderedMarkdown"></div>
    </div>
    <div v-else class="blinking-cursor w-3 h-6"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';
import { type CoreMessage } from 'ai';
import { renderMarkdown } from '~/utils/markdown';

interface Props {
  message: CoreMessage;
}

const props = defineProps<Props>();

// Typewriter state for string content
const displayedText = ref<string | null>(null);
let typingTimer: number | null = null;

// Markdown rendering using unified utility
const renderedMarkdown = computed(() => {
  if (typeof props.message.content !== 'string') return '';
  return renderMarkdown(props.message.content as string);
});

const stopTyping = () => {
  if (typingTimer !== null) {
    clearInterval(typingTimer);
    typingTimer = null;
  }
};

const startTyping = (fullText: string) => {
  stopTyping();
  displayedText.value = '';
  let i = 0;
  typingTimer = window.setInterval(() => {
    if (i >= fullText.length) {
      stopTyping();
      // Once finished, render the full text via normal path
      displayedText.value = null;
      return;
    }
    displayedText.value += fullText[i];
    i++;
  }, 5);
};

// Trigger typing only when content transitions from empty string to non-empty string
watch(
  () => (typeof props.message.content === 'string' ? (props.message.content as string) : null),
  (newVal, oldVal) => {
    if (typeof newVal === 'string' && newVal && oldVal === '') {
      startTyping(newVal);
    } else {
      // Not a typing scenario (arrays or initial non-empty load): show as-is
      displayedText.value = null;
      stopTyping();
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  stopTyping();
});
</script>

<style scoped>
.blinking-cursor {
  animation: blink 0.7s infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* Enhanced scrolling for embedded mode */
.chat-wrapper:deep(.embedded) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-wrapper:deep(.embedded .flex-1) {
  overflow: hidden;
}

.chat-wrapper:deep(.embedded .overflow-y-auto) {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--color-secondary-400)) transparent;
  max-height: 100%;
  overflow-y: auto;
}

.chat-wrapper:deep(.embedded .overflow-y-auto::-webkit-scrollbar) {
  width: 6px;
}

.chat-wrapper:deep(.embedded .overflow-y-auto::-webkit-scrollbar-track) {
  background: transparent;
}

.chat-wrapper:deep(.embedded .overflow-y-auto::-webkit-scrollbar-thumb) {
  background-color: hsl(var(--color-secondary-400));
  border-radius: 3px;
}

.chat-wrapper:deep(.embedded .overflow-y-auto::-webkit-scrollbar-thumb:hover) {
  background-color: hsl(var(--color-secondary-500));
}

/* Ensure proper height distribution in embedded mode */
.chat-wrapper.embedded {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-wrapper.embedded > div:first-child {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-wrapper.embedded .flex-1 {
  min-height: 0;
  overflow: hidden;
}

.chat-wrapper.embedded .overflow-y-auto {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

/* Ensure smooth scrolling on all browsers */
.chat-wrapper .overflow-y-auto {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
</style>

