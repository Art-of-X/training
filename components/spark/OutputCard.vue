<template>
  <div 
    class="group relative rounded-lg flex flex-col justify-between w-48 h-48 cursor-pointer transition overflow-hidden bg-primary-500 output-card"
    @click="emit('select', output)"
  >
    <!-- Cover Image Section - Full square, no padding/margin -->
    <div class="w-full flex-1 flex items-center justify-center min-h-32">
      <div class="w-full h-full" :style="gradientStyle"></div>
    </div>

    <!-- Content Section -->
    <div class="p-3">
      <h4 class="font-bold mb-1  text-sm " :style="{ color: secondaryColor }">
        <span v-if="output.status === 'text-only'" class="opacity-70">Generating idea...</span>
        <span v-else>{{ output.title }}</span>
      </h4>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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

function hashStringToAngle(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash % 360;
}

const gradientStyle = computed(() => {
  const angle = hashStringToAngle(props.output.id || props.output.title || '0');
  return {
    background: `linear-gradient(${angle}deg, ${primaryColor.value}, ${secondaryColor.value})`
  } as Record<string, string>;
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
.output-card:hover h4 {
  color: v-bind(primaryColor) !important;
}

/* Use CSS variables for dynamic secondary color so it works in scoped styles */
:root { --card-secondary: #888; }
</style>
