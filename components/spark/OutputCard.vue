<template>
  <div 
    class="relative rounded-lg p-4 flex flex-col justify-between aspect-square cursor-pointer hover:opacity-90 transition"
    :style="{ backgroundColor: output.persona.color }"
    @click="emit('select', output)"
  >
    <div>
      <h4 class="font-bold text-white mb-2">Idea:</h4>
      <p class="text-white text-sm">
        {{ truncatedOutput }}
      </p>
    </div>
    <div class="self-end">
      <div 
        class="x-mask w-6 h-6"
        :style="{ backgroundColor: 'white' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Persona {
  id: string;
  name: string;
  color: string;
}

interface Output {
  id: string;
  persona: Persona;
  text: string;
}

const props = defineProps<{
  output: Output;
}>();

const emit = defineEmits<{
  (e: 'select', output: Output): void
}>()

const truncatedOutput = computed(() => {
  const maxLength = 150;
  if (props.output.text.length > maxLength) {
    return props.output.text.slice(0, maxLength) + '...';
  }
  return props.output.text;
});
</script>

<style scoped>
.x-mask {
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}
</style>
