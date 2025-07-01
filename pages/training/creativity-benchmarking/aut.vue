<template>
  <div class="py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Alternate Uses Test (AUT)</h1>
      <p class="text-lg text-secondary-600 dark:text-secondary-300">
        Think of as many creative and unusual uses as you can for the object mentioned below.
      </p>
    </div>

    <!-- Main Test Card -->
    <div class="card dark:bg-secondary-800 dark:border-secondary-700">
      <div class="card-body">
        <!-- Loading State -->
        <div v-if="pending" class="text-center text-secondary-500 dark:text-secondary-400">
          <div class="loading-spinner mx-auto"></div>
          <p class="mt-2">Loading a creative challenge...</p>
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
                <p class="text-secondary-600 dark:text-secondary-300 mb-6">Your ideas have been saved. Ready for another challenge?</p>
            </div>
            <button @click="getNextQuestion" class="btn-primary">Next Question</button>
        </div>

        <!-- Test Interface -->
        <div v-else-if="question" class="space-y-6">
          <div class="text-center">
            <p class="text-sm text-secondary-600 dark:text-secondary-400">Your object is:</p>
            <h2 class="text-4xl font-bold text-primary-600 dark:text-primary-400 capitalize">{{ question.object }}</h2>
          </div>

          <!-- Input Form -->
          <form @submit.prevent="addUse" class="flex gap-4">
            <input
              v-model="newUse"
              type="text"
              class="form-input flex-grow"
              placeholder="Enter a creative use..."
              required
            />
            <button type="submit" class="btn-secondary">Add Use</button>
          </form>

          <!-- Uses List -->
          <div v-if="uses.length > 0" class="space-y-3">
             <transition-group name="list" tag="ul" class="space-y-3">
              <li
                v-for="(use, index) in uses"
                :key="use" 
                class="flex items-center justify-between p-3 rounded-lg bg-secondary-100 dark:bg-secondary-700/50"
              >
                <span class="text-secondary-800 dark:text-secondary-200">{{ use }}</span>
                <button @click="removeUse(index)" class="text-secondary-400 hover:text-error-500 dark:hover:text-error-400 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </li>
            </transition-group>
          </div>
          <div v-else class="text-center text-secondary-500 py-4">
            Start by adding your first idea above.
          </div>

          <!-- Submission -->
          <div class="pt-4 border-t border-secondary-200 dark:border-secondary-700 text-right">
            <button
              @click="submitAnswer"
              :disabled="isSubmitting || uses.length === 0"
              class="btn-primary"
            >
              <span v-if="isSubmitting" class="loading-spinner-sm mr-2"></span>
              {{ isSubmitting ? 'Submitting...' : 'Submit All Uses' }}
            </button>
            <p v-if="submissionError" class="text-error-500 text-sm mt-2">{{ submissionError }}</p>
          </div>
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
import { ref, onMounted } from 'vue'

definePageMeta({
  layout: 'default',
})

interface AUTQuestion {
  id: number;
  object: string;
}

const { data: question, pending, error, refresh } = useFetch<AUTQuestion>('/api/creativity-benchmarking/aut/questions')

const newUse = ref('')
const uses = ref<string[]>([])
const isSubmitting = ref(false)
const submissionError = ref<string | null>(null)
const submissionSuccess = ref(false)

function addUse() {
  const trimmedUse = newUse.value.trim()
  if (trimmedUse && !uses.value.includes(trimmedUse)) {
    uses.value.unshift(trimmedUse) // Add to the top
    newUse.value = ''
  }
}

function removeUse(index: number) {
  uses.value.splice(index, 1)
}

async function submitAnswer() {
  if (!question.value || uses.value.length === 0) return

  isSubmitting.value = true
  submissionError.value = null
  
  try {
    await $fetch('/api/creativity-benchmarking/aut/answer', {
      method: 'POST',
      body: {
        questionId: question.value.id,
        uses: uses.value,
      },
    })
    submissionSuccess.value = true
  } catch (err: any) {
    submissionError.value = err.data?.message || 'An unexpected error occurred.'
    // Re-enable button on failure
    isSubmitting.value = false
  }
}

function getNextQuestion() {
  submissionSuccess.value = false
  submissionError.value = null
  isSubmitting.value = false
  uses.value = []
  refresh()
}

onMounted(() => {
    // initial fetch
})
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style> 