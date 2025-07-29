<template>
  <div class="h-full">
    <div class="container-wide flex flex-col flex-grow min-h-0 py-8">
      <h1 class="text-2xl font-bold text-secondary-900 dark:text-white mb-4 flex items-center">
        Your Mental Model
        <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full dark:bg-blue-900/50 dark:text-blue-300 ml-3">EXPERIMENTAL</span>
      </h1>
      <div class="flex-grow flex items-center justify-center">
        <div v-if="userProfile?.id" class="w-full h-full">
          <UserPatternGraph :userId="userProfile.id" />
        </div>
        <p v-else class="text-secondary-600 dark:text-secondary-400">Loading user profile to display mental model...</p>
      </div>
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