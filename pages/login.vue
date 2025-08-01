<template>
  <div class="w-full space-y-8">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-3xl font-bold text-secondary-900">
        Sign in to your account
      </h2>
      <p class="mt-2 text-sm text-secondary-600">
        Continue your training journey
      </p>
    </div>

    <!-- Success message from redirect (e.g., email confirmed) -->
    <div v-if="successMessage" class="bg-success-50/80 border border-success-200 text-success-700 px-4 py-3">
      {{ successMessage }}
    </div>

    <!-- Sign in form -->
    <form class="mt-8 space-y-6" @submit.prevent="handleSignIn">
      <div class="space-y-4">
        <div>
          <label for="email" class="form-label">
            Email address
          </label>
          <input
            id="email"
            v-model="form.email"
            name="email"
            type="email"
            autocomplete="email"
            required
            class="form-input"
            :class="{ 'border-error-300': errors.email }"
            placeholder="Enter your email"
          />
          <p v-if="errors.email" class="form-error">
            {{ errors.email }}
          </p>
        </div>

        <div>
          <label for="password" class="form-label">
            Password
          </label>
          <input
            id="password"
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            class="form-input"
            :class="{ 'border-error-300': errors.password }"
            placeholder="Enter your password"
          />
          <p v-if="errors.password" class="form-error">
            {{ errors.password }}
          </p>
        </div>
      </div>

      <!-- Error display -->
      <div v-if="authError" class="bg-error-50/80 border border-error-200 text-error-700 px-4 py-3">
        {{ authError }}
      </div>

      <!-- Submit button -->
      <div>
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full btn-primary"
        >
          <span v-if="isLoading" class="loading-spinner mr-2"></span>
          {{ isLoading ? 'Signing in...' : 'Sign in' }}
        </button>
      </div>

      <!-- Links -->
      <div class="text-center space-y-2">
        <p class="text-sm text-secondary-600">
          Don't have an account?
          <NuxtLink to="/register" class="font-medium text-primary-600 hover:text-primary-500">
            Sign up
          </NuxtLink>
        </p>
        <p class="text-sm">
          <NuxtLink to="/password-reset" class="font-medium text-primary-600 hover:text-primary-500">
            Forgot your password?
          </NuxtLink>
        </p>
      </div>
    </form>
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
    await navigateTo('/training/dashboard')
  }
}

// Clear error when component mounts
onMounted(() => {
  clearError()
})
</script> 