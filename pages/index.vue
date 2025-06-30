<template>
  <div class="min-h-screen bg-white dark:bg-secondary-900">
    <!-- Loading state -->
    <div v-if="pending" class="min-h-screen flex items-center justify-center">
      <div class="loading-spinner text-primary-600"></div>
    </div>

    <!-- Main content -->
    <div v-else class="container-narrow py-12">
      <!-- Hero section for non-authenticated users -->
      <div v-if="!user" class="text-center">
        <h1 class="text-4xl md:text-6xl font-bold text-secondary-900 dark:text-white mb-6">
          Artificial Artistic Thinking
        </h1>
        <p class="text-xl text-secondary-600 dark:text-secondary-300 mb-8 max-w-2xl mx-auto">
          A secure, state-of-the-art platform for capturing and training AI models on artists' creative essence through portfolio sharing, monologues, peer training, and observation.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink to="/register" class="btn-primary">
            Get Started
          </NuxtLink>
          <NuxtLink to="/login" class="btn-outline">
            Sign In
          </NuxtLink>
        </div>
      </div>

      <!-- Welcome back message for authenticated users -->
      <div v-else class="text-center">
        <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-4">
          Welcome back!
        </h1>
        <p class="text-lg text-secondary-600 dark:text-secondary-300 mb-8">
          Continue your creative DNA training journey.
        </p>
        <NuxtLink to="/training/dashboard" class="btn-primary">
          Continue Training
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Set page metadata
definePageMeta({
  title: 'Artificial Artistic Thinking Platform',
  description: 'Secure platform for capturing artists\' creative DNA through AI training'
})

// Get authentication state
const user = useSupabaseUser()
const { pending } = useAsyncData('user-check', () => Promise.resolve(user.value))

// Redirect authenticated users to their training dashboard
watch(user, (newUser) => {
  if (newUser && process.client) {
    navigateTo('/training/dashboard')
  }
}, { immediate: true })
</script> 