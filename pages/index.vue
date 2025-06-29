<template>
  <div class="min-h-screen bg-white">
    <!-- Loading state -->
    <div v-if="pending" class="min-h-screen flex items-center justify-center">
      <div class="loading-spinner text-primary-600"></div>
    </div>

    <!-- Main content -->
    <div v-else class="container-narrow py-12">
      <!-- Hero section for non-authenticated users -->
      <div v-if="!user" class="text-center">
        <h1 class="text-4xl md:text-6xl font-bold text-secondary-900 mb-6">
          Artificial Artistic Thinking
        </h1>
        <p class="text-xl text-secondary-600 mb-8 max-w-2xl mx-auto">
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

        <!-- Features overview -->
        <div class="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div class="text-center">
            <div class="w-12 h-12 bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">Portfolio</h3>
            <p class="text-secondary-600">Share your creative work through links and PDF uploads</p>
          </div>

          <div class="text-center">
            <div class="w-12 h-12 bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">Monologue</h3>
            <p class="text-secondary-600">Record audio responses to creative prompts</p>
          </div>

          <div class="text-center">
            <div class="w-12 h-12 bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary-900 mb-2">Peer Training</h3>
            <p class="text-secondary-600">Collaborative video sessions with other artists</p>
          </div>

          <div class="text-center">
            <div class="w-12 h-12 bg-secondary-100 text-secondary-500 flex items-center justify-center mx-auto mb-4">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-secondary-500 mb-2">Observation</h3>
            <p class="text-secondary-400">Coming Soon</p>
          </div>
        </div>
      </div>

      <!-- Welcome back message for authenticated users -->
      <div v-else class="text-center">
        <h1 class="text-3xl font-bold text-secondary-900 mb-4">
          Welcome back!
        </h1>
        <p class="text-lg text-secondary-600 mb-8">
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