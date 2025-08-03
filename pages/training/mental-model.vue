<template>
  <div class="h-full flex flex-col overflow-hidden bg-white dark:bg-secondary-900">
    <!-- Header section constrained to container -->
    <div class="flex-shrink-0 py-8">
      <div class="container-wide">
        <h1 class="text-2xl font-bold text-secondary-900 dark:text-white mb-4 flex items-center">
          Your Mental Model
          <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-blue-900/50 dark:text-blue-300 ml-3">EXPERIMENTAL</span>
        </h1>
      </div>
    </div>
    
    <!-- Graph section full width -->
    <div class="flex-grow relative min-h-0 overflow-hidden w-full">
      <div v-if="userProfile?.id" class="absolute inset-0">
        <UserPatternGraph :userId="userProfile.id" />
      </div>
      <p v-else class="text-secondary-600 dark:text-secondary-400 flex items-center justify-center h-full">Loading user profile to display mental model...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports';
import UserPatternGraph from '~/components/UserPatternGraph.vue';
import { useUserProfile } from '~/composables/useUserProfile';

definePageMeta({
  title: 'Your Mental Model'
})

const { userProfile } = useUserProfile();
</script>

<style scoped>
/* Add any specific styles for the mental model page here */
</style> 