<template>
  <XBackground v-if="!isMobile" />
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

// Detect mobile devices
const isMobile = ref(false);

onMounted(() => {
  // Check for mobile devices using user agent and screen size
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  const isMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));
  const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 600;
  
  isMobile.value = isMobileUserAgent || isSmallScreen;
});

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
