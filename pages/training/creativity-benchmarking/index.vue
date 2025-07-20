<template>
  <div class="py-8 container-wide">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Creativity Benchmarking</h1>
      <p class="text-lg text-secondary-600 dark:text-secondary-300">
        Engage in a series of standardized tests to measure and understand your creative potential.
      </p>
    </div>

    <!-- Test Sections -->
    <div class="space-y-8">
      <!-- Alternate Uses Test (AUT) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">Alternate Uses Test (AUT)</h2>
          <span v-if="autProgress" :class="[
            autProgress.answered > 0 && autProgress.answered === autProgress.total ? 'bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300' : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-200',
            'ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium'
          ]">
            {{ autProgress.answered }}/{{ autProgress.total }}
          </span>
        </div>
        <p class="text-secondary-600 dark:text-secondary-300 mb-4">
          Measures divergent thinking. You'll be given a common object and asked to list as many unusual uses for it as possible.
        </p>
        <NuxtLink to="/training/creativity-benchmarking/aut" class="btn-primary">
          {{ autProgress && autProgress.answered > 0 ? 'Continue Test' : 'Start AUT' }}
        </NuxtLink>
      </div>

      <!-- Remote Associates Test (RAT) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">Remote Associates Test (RAT)</h2>
          <span v-if="ratProgress" :class="[
            ratProgress.answered > 0 && ratProgress.answered === ratProgress.total ? 'bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300' : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-200',
            'ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium'
          ]">
            {{ ratProgress.answered }}/{{ ratProgress.total }}
          </span>
        </div>
        <p class="text-secondary-600 dark:text-secondary-300 mb-4">
          Measures convergent creative thinking. Find a common word that links three seemingly unrelated words.
        </p>
        <NuxtLink to="/training/creativity-benchmarking/rat" class="btn-primary">
          {{ ratProgress && ratProgress.answered > 0 ? 'Continue Test' : 'Start RAT' }}
        </NuxtLink>
      </div>

      <!-- Divergent Association Task (DAT) -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">Divergent Association Task (DAT)</h2>
          <span v-if="datProgress && datProgress.hasSubmitted" class="bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300 ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium flex items-center">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            Done
          </span>
        </div>
        <p class="text-secondary-600 dark:text-secondary-300 mb-4">
          Measures verbal creativity. Name 10 words that are as semantically distant from each other as possible. Can only be completed once for research validity.
        </p>
        <NuxtLink to="/training/creativity-benchmarking/dat" class="btn-primary">
          {{ datProgress && datProgress.hasSubmitted ? 'View Completion' : 'Start DAT' }}
        </NuxtLink>
      </div>
    </div>

    <!-- Navigation -->
    <div class="flex justify-between mt-8">
      <NuxtLink to="/training/dashboard" class="btn-secondary">
        Back to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

interface Progress {
  answered: number;
  total: number;
}
interface DatProgress {
  hasSubmitted: boolean;
}

const { data: autProgress } = useFetch<Progress>('/api/creativity-benchmarking/aut/progress', { lazy: true })
const { data: ratProgress } = useFetch<Progress>('/api/creativity-benchmarking/rat/progress', { lazy: true })
const { data: datProgress } = useFetch<DatProgress>('/api/creativity-benchmarking/dat/progress', { lazy: true })

</script>

<style scoped>
/* Using global styles from main.css, so no specific styles needed here unless for customization */
</style> 