<template>
  <div v-if="!isResearch" class="relative" ref="switcher">
    <button @click="isOpen = !isOpen" class="p-2 text-secondary-500 hover:text-primary-500 dark:hover:text-primary-400" aria-label="Open theme switcher">
      <svg v-if="$colorMode.value === 'light'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m8.66-15.66l-.707.707M4.34 19.66l-.707.707M21 12h-1M4 12H3m15.66 8.66l-.707-.707M5.05 5.05l-.707-.707"></path>
      </svg>
      <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full right-0 mt-2 w-36 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-lg"
    >
      <ul>
        <li
          v-for="theme in themes"
          :key="theme.value"
          @click="setTheme(theme.value)"
          class="px-4 py-2  text-sm  text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer"
          :class="{ 'font-bold text-primary-600 dark:text-primary-400': colorMode.preference === theme.value }"
        >
          {{ theme.name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'

const { isResearch } = useVersion()
const colorMode = useColorMode()
const isOpen = ref(false)
const switcher = ref(null)

const themes = [
  { name: 'Light', value: 'light' },
  { name: 'Dark', value: 'dark' },
  { name: 'System', value: 'system' },
]

const setTheme = (theme: string) => {
  colorMode.preference = theme as any
  isOpen.value = false
}

onClickOutside(switcher, () => {
  isOpen.value = false
})
</script> 