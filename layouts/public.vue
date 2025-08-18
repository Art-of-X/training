<template>
  <div class="min-h-screen bg-white dark:bg-secondary-900">
    <!-- Header -->
    <header class="border-b border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <NuxtLink to="/" class="text-xl font-bold text-primary-500">
            Art of X
          </NuxtLink>
          <div class="flex items-center space-x-4">
            <NuxtLink 
              to="/login" 
              class="text-secondary-600 dark:text-secondary-400 hover:text-primary-500 dark:hover:text-primary-400"
            >
              Sign In
            </NuxtLink>
            <NuxtLink 
              to="/register" 
              class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Get Started
            </NuxtLink>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 py-8">
      <div class="container mx-auto px-4 text-center text-secondary-600 dark:text-secondary-400">
        <p>&copy; 2024 Art of X. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Public layout - no authentication required
</script>

<style>
body {
  /* Clean minimal background */
  @apply bg-white dark:bg-secondary-900;
}
</style>
