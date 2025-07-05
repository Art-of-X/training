<template>
  <XBackground />
  <main class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <slot />
    </div>
  </main>
  <Footer />
</template>

<script setup lang="ts">
import XBackground from '~/components/XBackground.vue';
import Footer from '~/components/Footer.vue';

useHead({
  bodyAttrs: {
    class: 'overflow-hidden'
  }
})
</script>

<style>
body {
  /* The background is handled by the XBackground component, but set a fallback */
  @apply bg-white dark:bg-secondary-900;
}
</style>
