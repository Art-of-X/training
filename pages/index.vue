<template>
  <div class="flex items-center justify-center min-h-screen bg-secondary-50 dark:bg-secondary-900">
    <div class="text-center">
      <div class="loading-spinner mx-auto mb-4"></div>
      <p class="text-secondary-600 dark:text-secondary-400">Redirecting...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// The middleware will handle the actual redirect logic
// This page serves as a fallback and loading state
</script>

<style scoped>
.loading-spinner {
  @apply w-8 h-8 border-4 border-secondary-300 border-t-primary-500 rounded-full animate-spin;
}
</style> 