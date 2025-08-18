<template>
  <main class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <slot />
    </div>
  </main>
  <Footer />
</template>

<script setup lang="ts">
import Footer from '~/components/Footer.vue';
import { useAuth } from "~/composables/useAuth";
import { useUserProfile } from "~/composables/useUserProfile";

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

// Dynamic page title for auth pages
const { user } = useAuth();
const { userProfile, isLoadingProfile } = useUserProfile();
const pageTitle = computed(() => {
  const supabaseUser = user.value as any
  const displayName =
    userProfile.value?.name ||
    supabaseUser?.user_metadata?.display_name ||
    supabaseUser?.user_metadata?.name ||
    (supabaseUser?.email ? supabaseUser.email.split('@')[0] : '')
  return `Art of ${displayName || 'X'}`
});

useHead(() => ({
  title: pageTitle.value,
  titleTemplate: () => pageTitle.value,
  bodyAttrs: {
    class: 'overflow-hidden'
  }
}))
</script>

<style>
body {
  /* Clean minimal background */
  @apply bg-white dark:bg-secondary-900;
}
</style>
