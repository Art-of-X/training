<template>
  <div class="py-8 container-wide">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Demographics Questionnaire</h1>
      <p class=" text-sm  text-secondary-600 dark:text-secondary-300">
        Help us understand your background by answering these questions. Your responses will be kept confidential.
      </p>
    </div>

    <!-- Main Questionnaire Card -->
    <div class="card dark:bg-secondary-800 dark:border-secondary-700">
      <div class="card-body">
        <!-- Loading State -->
        <div v-if="pending" class="text-center text-secondary-500 dark:text-secondary-400">
          <div class="loading-spinner mx-auto"></div>
          <p class="mt-2">Loading questionnaire...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center text-error-500">
          <p>Could not load questionnaire. Please try again later.</p>
          <button @click="() => refresh()" class="btn-secondary mt-4">Try Again</button>
        </div>
        
        <!-- Success State -->
        <div v-else-if="submissionSuccess" class="text-center">
          <div class="text-success-600 dark:text-success-400 flex flex-col items-center">
            <svg class="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 class=" text-3xl  font-semibold mb-2">Thank You!</h2>
            <p class="text-secondary-600 dark:text-secondary-300 mb-6">Your demographic information has been saved successfully.</p>
          </div>
          <NuxtLink to="/training/chat" class="btn-primary">Back to Dashboard</NuxtLink>
        </div>

        <!-- Questionnaire Form -->
        <form v-else-if="questions" @submit.prevent="submitAnswers" class="space-y-8">
          <div v-for="question in questions" :key="question.key" class="space-y-3">
            <!-- Question Text -->
            <label class="block  text-sm  font-medium text-secondary-900 dark:text-white">
              {{ question.question }}
              <span v-if="question.required" class="text-error-500">*</span>
            </label>

            <!-- Multiple Choice -->
            <div v-if="question.type === 'multiple_choice'" class="space-y-2">
              <label
                v-for="option in question.options"
                :key="option"
                class="flex items-center space-x-3 p-3 border border-secondary-200 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700/50 cursor-pointer transition-colors"
              >
                <input
                  :value="option"
                  v-model="answers[question.key]"
                  type="radio"
                  :name="`question-${question.key}`"
                  class="text-primary-600 focus:ring-primary-500"
                  :required="question.required"
                />
                <span class="text-secondary-700 dark:text-secondary-300">{{ option }}</span>
              </label>
            </div>

            <!-- Text Input -->
            <input
              v-else-if="question.type === 'text'"
              v-model="answers[question.key]"
              type="text"
              class="form-input w-full"
              :placeholder="'Enter your answer...'"
              :required="question.required"
            />

            <!-- Number Input -->
            <input
              v-else-if="question.type === 'number'"
              v-model="answers[question.key]"
              type="number"
              class="form-input w-full"
              :placeholder="'Enter a number...'"
              :required="question.required"
            />

            <!-- Range Input -->
            <div v-else-if="question.type === 'range'" class="space-y-2">
              <input
                v-model="answers[question.key]"
                type="range"
                :min="question.min || 1"
                :max="question.max || 10"
                class="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer dark:bg-secondary-700"
                :required="question.required"
              />
              <div class="flex justify-between  text-sm  text-secondary-500">
                <span>{{ question.min || 1 }}</span>
                <span class="font-medium">{{ answers[question.key] || 5 }}</span>
                <span>{{ question.max || 10 }}</span>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-6 border-t border-secondary-200 dark:border-secondary-700">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="btn-primary w-full"
            >
              <span v-if="isSubmitting" class="loading-spinner-sm mr-2"></span>
              {{ isSubmitting ? 'Submitting...' : 'Submit Answers' }}
            </button>
            <p v-if="submissionError" class="text-error-500  text-sm  mt-2 text-center">{{ submissionError }}</p>
          </div>
        </form>
      </div>
    </div>

    <!-- Navigation -->
    <div class="mt-8">
      <NuxtLink to="/training/chat" class="btn-secondary">
        Back to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

definePageMeta({
  layout: 'default',
})

interface DemographicsQuestion {
  key: string
  question: string
  type: string
  options?: string[]
  category: string
  required: boolean
  order: number
  min?: number
  max?: number
  currentAnswer: string | null
}

const { data: questions, pending, error, refresh } = useFetch<DemographicsQuestion[]>('/api/demographics/questions')

const answers = reactive<Record<string, string>>({})
const isSubmitting = ref(false)
const submissionError = ref<string | null>(null)
const submissionSuccess = ref(false)

// Initialize answers with existing data
watch(questions, (newQuestions) => {
  if (newQuestions) {
    newQuestions.forEach(question => {
      if (question.currentAnswer) {
        answers[question.key] = question.currentAnswer
      } else if (question.type === 'range') {
        answers[question.key] = '5' // Default range value
      }
    })
  }
}, { immediate: true })

async function submitAnswers() {
  if (!questions.value) return

  isSubmitting.value = true
  submissionError.value = null
  
  try {
    // Format answers for submission
    const formattedAnswers = Object.entries(answers).map(([questionKey, answer]) => ({
      questionKey: questionKey,
      answer: answer
    }))

    await $fetch('/api/demographics/submit', {
      method: 'POST',
      body: {
        answers: formattedAnswers,
      },
    })
    
    submissionSuccess.value = true
  } catch (err: any) {
    submissionError.value = err.data?.message || 'An unexpected error occurred.'
    isSubmitting.value = false
  }
}

onMounted(() => {
  // Initial fetch handled by useFetch
})
</script>

<style scoped>
.form-input {
  @apply block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-secondary-700 dark:border-secondary-600 dark:placeholder-secondary-500 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500;
}

.btn-primary {
  @apply bg-primary-600 text-white font-semibold py-3 px-6 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-secondary-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 transition-colors;
}

.card {
  @apply bg-white border border-secondary-200 shadow-sm rounded-lg dark:bg-secondary-800 dark:border-secondary-700;
}

.card-body {
  @apply p-6;
}

.loading-spinner {
  @apply inline-block w-6 h-6 border-2 border-secondary-300 border-t-primary-600 rounded-full animate-spin;
}

.loading-spinner-sm {
  @apply inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin;
}
</style> 