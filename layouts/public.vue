<template>
  <div class="bg-secondary-50 dark:bg-secondary-900 min-h-screen">
    <header class="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-40">
      <div class="container-wide">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <span class="font-bold text-xl text-secondary-900 dark:text-white">Artistic AI</span>
          </NuxtLink>
          <div class="flex items-center space-x-2 sm:space-x-4">
            <ThemeSwitcher />
            <nav class="flex items-center space-x-2 sm:space-x-4">
              <NuxtLink to="/login" class="btn-outline px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">Sign In</NuxtLink>
              <NuxtLink to="/register" class="btn-primary px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm">Get Started</NuxtLink>
            </nav>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-grow">
      <div class="container-wide py-8">
        <slot />
      </div>
    </main>

    <footer class="bg-white dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700">
      <div class="container-wide py-6">
        <div class="flex flex-col items-center space-y-4">
          <div class="flex space-x-4">
            <NuxtLink
              v-for="link in versionConfig.footerLinks"
              :key="link.to"
              :to="link.to"
              :external="link.external"
              :target="link.external ? '_blank' : undefined"
              :rel="link.external ? 'noopener noreferrer' : undefined"
              class="text-sm text-secondary-600 hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400 transition-colors"
            >
              {{ link.text }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import ThemeSwitcher from '~/components/ThemeSwitcher.vue';
import { useVersion } from '~/composables/useVersion';

const { versionConfig } = useVersion();
</script>

<style>
body {
  @apply bg-secondary-50 text-secondary-900;
  @apply dark:bg-secondary-900 dark:text-secondary-100;
}
</style> 