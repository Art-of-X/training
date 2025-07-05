<template>
  <div class="bg-white dark:bg-secondary-900 min-h-screen">
    <header class="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-40">
      <div class="container-wide">
        <div class="flex justify-between items-center h-16">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <span class="font-bold text-xl text-secondary-900 dark:text-white">
              Art<sup class="text-base font-semibold">x</sup>
            </span>
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

    <main class="container-wide py-8 md:py-12">
      <div class="prose dark:prose-invert max-w-4xl mx-auto">
        <slot />
      </div>
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import ThemeSwitcher from '~/components/ThemeSwitcher.vue';
import Footer from '~/components/Footer.vue';

useHead({
  bodyAttrs: {
    class: 'overflow-auto'
  }
})
</script> 