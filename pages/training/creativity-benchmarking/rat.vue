<template>
  <div class="py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Remote Associates Test (RAT)</h1>
      <p class="text-lg text-secondary-600 dark:text-secondary-300">
        Find a single word that connects the three words presented below.
      </p>
    </div>

    <!-- Main Test Card -->
    <div class="card dark:bg-secondary-800 dark:border-secondary-700">
      <div class="card-body">
        <!-- Loading State -->
        <div v-if="pending" class="text-center text-secondary-500 dark:text-secondary-400">
          <div class="loading-spinner mx-auto"></div>
          <p class="mt-2">Loading a new puzzle...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center text-error-500">
          <p>Could not load a question. Please try again later.</p>
          <button @click="() => refresh()" class="btn-secondary mt-4">Try Again</button>
        </div>
        
        <!-- Success State -->
        <div v-else-if="submissionSuccess" class="text-center">
            <div class="text-success-600 dark:text-success-400 flex flex-col items-center">
                <svg class="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h2 class="text-2xl font-semibold mb-2">Submission Successful!</h2>
                <p class="text-secondary-600 dark:text-secondary-300 mb-6">Your answer has been saved. Ready for the next one?</p>
            </div>
            <button @click="getNextQuestion" class="btn-primary">Next Puzzle</button>
        </div>

        <!-- Test Interface -->
        <div v-else-if="question" class="space-y-8">
          <div class="text-center">
            <p class="text-sm text-secondary-600 dark:text-secondary-400 mb-4">What word connects these three?</p>
            <div class="flex justify-center items-center space-x-4 md:space-x-8">
              <span class="text-2xl md:text-4xl font-bold text-primary-600 dark:text-primary-400 capitalize p-4 bg-secondary-100 dark:bg-secondary-700/50 rounded-lg">{{ question.word1 }}</span>
              <span class="text-2xl md:text-4xl font-bold text-primary-600 dark:text-primary-400 capitalize p-4 bg-secondary-100 dark:bg-secondary-700/50 rounded-lg">{{ question.word2 }}</span>
              <span class="text-2xl md:text-4xl font-bold text-primary-600 dark:text-primary-400 capitalize p-4 bg-secondary-100 dark:bg-secondary-700/50 rounded-lg">{{ question.word3 }}</span>
            </div>
          </div>

          <!-- Input Form -->
          <form @submit.prevent="submitAnswer" class="max-w-md mx-auto space-y-4">
            <input
              v-model="answer"
              type="text"
              class="form-input text-center text-lg"
              placeholder="Your answer"
              required
            />
            <button
              type="submit"
              :disabled="isSubmitting || !answer"
              class="btn-primary w-full"
            >
              <span v-if="isSubmitting" class="loading-spinner-sm mr-2"></span>
              {{ isSubmitting ? 'Submitting...' : 'Submit Answer' }}
            </button>
            <p v-if="submissionError" class="text-error-500 text-sm text-center mt-2">{{ submissionError }}</p>
          </form>
        </div>
      </div>
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
import { ref } from 'vue'

definePageMeta({
  layout: 'default',
})

interface RATQuestion {
  id: number;
  word1: string;
  word2: string;
  word3: string;
}

const { data: question, pending, error, refresh } = useFetch<RATQuestion>('/api/creativity-benchmarking/rat/questions')

const answer = ref('')
const isSubmitting = ref(false)
const submissionError = ref<string | null>(null)
const submissionSuccess = ref(false)

async function submitAnswer() {
  if (!question.value || !answer.value.trim()) return

  isSubmitting.value = true
  submissionError.value = null
  
  try {
    await $fetch('/api/creativity-benchmarking/rat/answer', {
      method: 'POST',
      body: {
        questionId: question.value.id,
        answer: answer.value.trim(),
      },
    })
    submissionSuccess.value = true
  } catch (err: any) {
    submissionError.value = err.data?.message || 'An unexpected error occurred.'
  } finally {
      if(!submissionSuccess.value) {
        isSubmitting.value = false
      }
  }
}

function getNextQuestion() {
  submissionSuccess.value = false
  submissionError.value = null
  isSubmitting.value = false
  answer.value = ''
  refresh()
}

</script>

<style scoped>
/* Scoped styles if needed */
</style>