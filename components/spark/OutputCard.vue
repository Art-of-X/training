<template>
  <div 
    class="group relative rounded-lg flex flex-col justify-between aspect-square cursor-pointer transition overflow-hidden bg-primary-500 output-card"
    @click="emit('select', output)"
  >
    <!-- Cover Image Section - Full square, no padding/margin -->
    <div class="w-full flex-1 bg-white/10 flex items-center justify-center">
      <div v-if="output.coverImageUrl" class="w-full h-full">
        <img 
          :src="output.coverImageUrl" 
          :alt="output.title"
          class="w-full h-full object-cover filter grayscale"
          @click.stop="emit('select', output)"
        />
      </div>
      <div v-else class="text-center p-4">
        <div class="text-sm" :style="{ color: secondaryColor }">No image</div>
      </div>
    </div>

    <!-- Content Section -->
    <div class="p-3">
      <h4 class="font-bold mb-1 text-sm" :style="{ color: secondaryColor }">
        <span v-if="output.status === 'text-only'" class="opacity-70">Generating idea...</span>
        <span v-else>{{ output.title }}</span>
      </h4>
      <div class="text-xs markdown-content" :style="{ color: secondaryColor }">
        <div v-if="output.status === 'text-only'" class="opacity-70">
          <div class="animate-pulse bg-white/20 h-2 rounded mb-1"></div>
          <div class="animate-pulse bg-white/20 h-2 rounded mb-1 w-3/4"></div>
        </div>
        <div v-else v-html="renderedPreview"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { renderMarkdown } from '~/utils/markdown';
import { primaryColor, secondaryColor } from '~/composables/useDynamicColors';

interface Persona {
  id: string;
  name: string;
  color: string;
}

interface Output {
  id: string;
  title: string;
  persona: Persona;
  text: string;
  coverPrompt?: string;
  coverImageUrl?: string;
  status?: 'text-only' | 'pending-image' | 'complete';
}

const props = defineProps<{
  output: Output;
}>();

const emit = defineEmits<{
  (e: 'select', output: Output): void
}>()

const truncatedOutput = computed(() => {
  const maxLength = 60; // Shorter length since image takes more space
  if (props.output.text.length > maxLength) {
    return props.output.text.slice(0, maxLength) + '...';
  }
  return props.output.text;
});

const renderedPreview = computed(() => {
  return renderMarkdown(truncatedOutput.value);
});
</script>

<style scoped>
.x-mask {
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}

/* Output card hover state - primary to secondary */
.output-card:hover { 
  background-color: v-bind(secondaryColor); 
}

/* Text color changes on hover */
.output-card:hover h4,
.output-card:hover .markdown-content,
.output-card:hover .text-xs {
  color: v-bind(primaryColor) !important;
}

.output-card:hover .markdown-content :deep(*) {
  color: v-bind(primaryColor) !important;
}

/* Use CSS variables for dynamic secondary color so it works in scoped styles */
:root { --card-secondary: #888; }
.markdown-content { --card-secondary: v-bind(secondaryColor); }

/* Markdown content styling for output cards */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  @apply text-sm font-semibold mt-1 mb-1;
  color: var(--card-secondary) !important;
}

.markdown-content :deep(p) {
  @apply my-1 text-sm;
  color: var(--card-secondary) !important;
}

.markdown-content :deep(strong) {
  @apply font-semibold;
  color: var(--card-secondary) !important;
}

.markdown-content :deep(em) {
  @apply italic;
  color: var(--card-secondary) !important;
}

.markdown-content :deep(code) {
  @apply bg-white/20 px-1 py-0.5 rounded text-xs font-mono;
  color: var(--card-secondary) !important;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  @apply ml-3 my-1 space-y-0.5;
}

.markdown-content :deep(li) {
  @apply text-sm;
  color: var(--card-secondary) !important;
}

.markdown-content :deep(a) {
  @apply underline;
  color: var(--card-secondary) !important;
}

.markdown-content :deep(blockquote) {
  @apply border-l-2 border-white/50 pl-2 my-1 italic;
  color: var(--card-secondary) !important;
}


</style>
