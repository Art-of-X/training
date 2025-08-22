<template>
  <div>
    <div class="flex justify-between mb-1">
      <span class=" text-sm  font-medium text-secondary-700 dark:text-secondary-300">{{ label }}</span>
      <span class=" text-sm  font-medium text-secondary-700 dark:text-secondary-300">{{ percentage }}%</span>
    </div>
    <div class="w-full bg-secondary-200 rounded-full h-2.5 dark:bg-secondary-700">
      <div class="bg-primary-600 h-2.5 rounded-full" :style="{ width: `${percentage}%` }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  completed: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
});

const percentage = computed(() => {
  if (props.total === 0) {
    // If total is 0, progress is 0, unless you want to show 100% if completed > 0
    return props.completed > 0 ? 100 : 0;
  }
  return Math.round(Math.min((props.completed / props.total) * 100, 100));
});
</script> 