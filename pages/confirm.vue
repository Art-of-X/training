<template>
  <div class="min-h-screen bg-white dark:bg-secondary-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 text-center">
      <h2 class="text-3xl font-bold text-secondary-900 dark:text-white">
        Check your email
      </h2>
      <p class="mt-2 text-sm text-secondary-600 dark:text-secondary-300">
        {{ message }}
      </p>
      <div class="mt-6">
        <NuxtLink to="/login" class="btn-primary">
          Back to Sign In
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Confirm Registration',
  layout: false,
});

const router = useRouter()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// This watcher waits for the user to be signed in by the confirmation link (PKCE flow),
// then immediately signs them out and sends them to the login page.
// This is a cleaner approach than using onAuthStateChange.
watch(user, async (currentUser) => {
  if (currentUser) {
    await supabase.auth.signOut()
    router.replace({ path: '/login', query: { message: 'Your email has been confirmed. You can now sign in.' } })
  }
}, { immediate: true })

const route = useRoute();
const message = computed(() => {
  const queryMessage = route.query.message;
  if (typeof queryMessage === 'string' && queryMessage) {
    return queryMessage;
  }
  return "A confirmation link has been sent to your email address. Please click the link to complete your registration.";
});
</script> 