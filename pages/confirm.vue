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

// If a session already exists (page rendered after PKCE exchange) redirect immediately
const {
  data: { session }
} = await supabase.auth.getSession()
if (session) {
  await supabase.auth.signOut()
  router.replace({ path: '/login', query: { message: 'Your email has been confirmed. You can now sign in.' } })
}

// Listen for the auth state change that happens when Supabase finishes exchanging the code
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
  if (event === 'SIGNED_IN') {
    // One-time sign-out so user needs to log in manually, then clean up listener
    await supabase.auth.signOut()
    subscription?.unsubscribe()
    router.replace({ path: '/login', query: { message: 'Your email has been confirmed. You can now sign in.' } })
  }
})

const route = useRoute();
const message = computed(() => {
  const queryMessage = route.query.message;
  if (typeof queryMessage === 'string' && queryMessage) {
    return queryMessage;
  }
  return "A confirmation link has been sent to your email address. Please click the link to complete your registration.";
});
</script> 