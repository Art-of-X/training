<template>
  <div class="container mx-auto px-4 flex items-center justify-center min-h-[calc(100vh-var(--app-header-height))]">
    <div class="w-full max-w-md bg-white dark:bg-secondary-800 rounded-lg space-y-8 h-full flex flex-col justify-center">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-3xl font-bold text-secondary-900 dark:text-white">
        Sign in to your account
      </h2>
      <p class="mt-2 text-sm text-secondary-600 dark:text-secondary-400">
        Continue your training journey
      </p>
    </div>

    <!-- Success message from redirect (e.g., email confirmed) -->
    <div v-if="successMessage" class="bg-success-50/80 dark:bg-success-900/80 border border-success-200 dark:border-success-700 text-success-700 dark:text-success-300 px-4 py-3 rounded-lg">
      {{ successMessage }}
    </div>

    <!-- Sign in form -->
    <form class="mt-8 space-y-6" @submit.prevent="handleSignIn">
      <div class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Email address
          </label>
          <input
            id="email"
            v-model="form.email"
            name="email"
            type="email"
            autocomplete="email"
            required
            class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            :class="{ 'border-error-300 dark:border-error-600': errors.email }"
            placeholder="Enter your email"
          />
          <p v-if="errors.email" class="mt-1 text-sm text-error-600 dark:text-error-400">
            {{ errors.email }}
          </p>
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Password
          </label>
          <input
            id="password"
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            :class="{ 'border-error-300 dark:border-error-600': errors.password }"
            placeholder="Enter your password"
          />
          <p v-if="errors.password" class="mt-1 text-sm text-error-600 dark:text-error-400">
            {{ errors.password }}
          </p>
        </div>
      </div>

      <!-- Error display -->
      <div v-if="authError" class="bg-error-50/80 dark:bg-error-900/80 border border-error-200 dark:border-error-700 text-error-700 dark:text-error-300 px-4 py-3 rounded-lg">
        {{ authError }}
      </div>

      <!-- Submit button -->
      <div>
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoading" class="loading-spinner mr-2"></span>
          {{ isLoading ? 'Signing in...' : 'Sign in' }}
        </button>
      </div>

      <!-- Links -->
      <div class="text-center space-y-2">
        <p class="text-sm text-secondary-600 dark:text-secondary-400">
          Don't have an account?
          <NuxtLink to="/register" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Sign up
          </NuxtLink>
        </p>
        <p class="text-sm">
          <NuxtLink to="/password-reset" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Forgot your password?
          </NuxtLink>
        </p>
      </div>
    </form>
    </div>
  </div>
</template>

<script setup lang="ts">
// Set page metadata
definePageMeta({
  title: 'Sign In',
  description: 'Sign in to your Artistic AI account',
  layout: 'public'
})

// Form state
const form = reactive({
  email: '',
  password: ''
})

const errors = reactive({
  email: '',
  password: ''
})

// Success message from redirect (e.g., email confirmed)
const route = useRoute()
const successMessage = computed(() => {
  const q = route.query.message
  return typeof q === 'string' && q ? q : ''
})

// Use auth composable
const { signIn, isLoading, error: authError, clearError } = useAuth()

// Clear errors when form changes
watch(() => form.email, () => {
  errors.email = ''
  clearError()
})

watch(() => form.password, () => {
  errors.password = ''
  clearError()
})

// Form validation
const validateForm = () => {
  let isValid = true
  
  // Reset errors
  errors.email = ''
  errors.password = ''
  
  // Email validation
  if (!form.email) {
    errors.email = 'Email is required'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Please enter a valid email address'
    isValid = false
  }
  
  // Password validation
  if (!form.password) {
    errors.password = 'Password is required'
    isValid = false
  }
  
  return isValid
}

// Handle form submission
const handleSignIn = async () => {
  if (!validateForm()) {
    return
  }

  const result = await signIn(form.email, form.password)

  if (result.success) {
    await navigateTo('/training/chat')
  }
}

// Clear error when component mounts
onMounted(() => {
  clearError()
})
</script> 