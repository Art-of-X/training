<template>
  <transition name="fade-transform">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50" @click="onBackdrop" />

      <!-- Panel -->
      <div :class="panelClass">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-3xl font-semibold text-secondary-900 dark:text-white">
            <slot name="title">{{ title }}</slot>
          </h3>
          <button
            type="button"
            class="text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 text-3xl font-bold leading-none"
            @click="close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <!-- Body -->
        <div class="max-h-96 overflow-y-auto">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.actions" class="flex justify-end gap-2 pt-4 mt-4 border-t border-secondary-200 dark:border-secondary-700">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </transition>
  
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
}>(), {
  title: '',
  maxWidth: 'lg',
  closeOnBackdrop: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const panelClass = computed(() => {
  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl'
  }[props.maxWidth]
  return `relative w-full ${sizeClass} bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg`
})

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onBackdrop() {
  if (props.closeOnBackdrop) close()
}
</script>

<style scoped>
</style>



