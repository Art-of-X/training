<template>
  <div class="bg-white dark:bg-secondary-900 min-h-screen">
    <header class="relative z-50 w-full bg-white dark:bg-secondary-900">
      <div class="max-w-7xl mx-auto flex justify-between items-center py-1 px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/" class="no-underline z-30 cursor-pointer" :style="`color: ${primaryColor}; font-size: 3rem;`">
          Art<sup>×</sup>
        </NuxtLink>
        <nav class="flex space-x-6 items-center">
          <NuxtLink to="/login" class="hover:text-gray-900 transition-colors text-xl no-underline" :style="`color: ${secondaryColor}`">
            Sign In
          </NuxtLink>
          <NuxtLink to="/register" :style="`background-color: ${primaryColor}`" class="px-3 py-1 text-xl font-normal text-white hover:opacity-90 transition-all duration-300 transform hover:scale-105">
            Get Access
          </NuxtLink>
        </nav>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-y-auto">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Footer from '~/components/Footer.vue';
import { onMounted } from 'vue';
import { useDynamicColors, primaryColor, secondaryColor } from '~/composables/useDynamicColors';

const { setColors } = useDynamicColors();

onMounted(() => {
  setColors();
});
</script>

<style>
:root {
  /* Header height: matches py-4 (1rem = 16px) + content height */
  --app-header-height: 80px;
}

body {
  /* Clean minimal background */
  @apply bg-white dark:bg-secondary-900;
}

.nav-link {
  @apply text-base font-medium transition-colors;
  color: var(--header-nav-color, rgb(100, 100, 100));
}

.nav-link:hover {
  color: var(--header-nav-hover-color, rgb(75, 85, 99));
}

.btn-primary-sm {
  @apply px-3 py-1.5  text-sm  bg-primary-500 text-white font-medium rounded-md transition-colors;
  @apply hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}

.btn-primary {
  @apply px-4 py-2 bg-primary-500 text-white font-medium rounded-md transition-colors;
  @apply hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}
</style>
