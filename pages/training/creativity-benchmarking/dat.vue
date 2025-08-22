<template>
  <div class="py-8 container-wide">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Divergent Association Task (DAT)</h1>
      <p class=" text-sm  text-secondary-600 dark:text-secondary-300">
        Your goal is to name 10 words that are as different from each other in meaning as possible.
      </p>
    </div>

    <!-- Main Test Content -->
    <div class="mb-8">
      <!-- Success State -->
      <div v-if="submissionSuccess" class="text-center">
          <div class="text-success-600 dark:text-success-400 flex flex-col items-center">
              <svg class="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <h2 class=" text-3xl  font-semibold mb-2">Task Complete!</h2>
              <p class="text-secondary-600 dark:text-secondary-300 mb-4">
                Your response has been recorded for research purposes.
              </p>
              <p class=" text-sm  text-secondary-500 dark:text-secondary-400 mb-6">
                The DAT can only be completed once to ensure data validity and fair comparison across all participants.
              </p>
          </div>
          <NuxtLink to="/training/creativity-benchmarking" class="btn-primary">
            Continue to Other Tests
          </NuxtLink>
      </div>

      <!-- Test Interface -->
      <form v-else @submit.prevent="submitWords" class="space-y-6">
        <p class="text-center text-secondary-700 dark:text-secondary-300">
            Try to avoid words that fall into the same category (e.g., apple, banana, pear). Think broadly!
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="i in 10" :key="i">
            <input
              v-model="words[i-1]"
              type="text"
              class="form-input w-full"
              :placeholder="`Word #${i}`"
              required
            />
          </div>
        </div>
        
        <div class="pt-4 border-t border-secondary-200 dark:border-secondary-700 text-right">
          <button
            type="submit"
            :disabled="isSubmitting || !allWordsEntered"
            class="btn-primary"
          >
            <span v-if="isSubmitting" class="loading-spinner-sm mr-2"></span>
            {{ isSubmitting ? 'Submitting...' : 'Submit Words' }}
          </button>
          <p v-if="submissionError" class="text-error-500  text-sm  mt-2">{{ submissionError }}</p>
        </div>
      </form>
    </div>

    <!-- Navigation -->
    <div class="mt-8">
      <NuxtLink to="/training/creativity-benchmarking" class="btn-secondary">
        Back to All Tests
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'default',
})

const words = ref<string[]>(Array(10).fill(''))
const isSubmitting = ref(false)
const submissionError = ref<string | null>(null)
const submissionSuccess = ref(false)

const allWordsEntered = computed(() => {
  return words.value.every(word => word.trim() !== '') && words.value.length === 10
})

async function submitWords() {
  if (!allWordsEntered.value) return

  isSubmitting.value = true
  submissionError.value = null
  
  try {
    await $fetch('/api/creativity-benchmarking/dat/submit', {
      method: 'POST',
      body: {
        words: words.value.map(w => w.trim()),
      },
    })
    submissionSuccess.value = true
  } catch (err: any) {
    submissionError.value = err.data?.message || 'An unexpected error occurred.'
    isSubmitting.value = false
  }
}

// Check if user has already completed DAT on page load
onMounted(async () => {
  try {
    const progress = await $fetch('/api/creativity-benchmarking/dat/progress')
    if (progress.hasSubmitted) {
      submissionSuccess.value = true
    }
  } catch (error) {
    console.error('Error checking DAT progress:', error)
  }
})
</script>

<style scoped>
/* Scoped styles if needed */
</style> 