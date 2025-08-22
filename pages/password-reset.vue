<template>
  <div class="container mx-auto px-4 flex items-center justify-center min-h-[calc(100vh-var(--app-header-height))]">
    <div class="w-full max-w-md bg-white dark:bg-secondary-800 rounded-lg space-y-8 h-full flex flex-col justify-center">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-3xl font-bold text-secondary-900 dark:text-white">
        {{ isResetting ? 'Set New Password' : 'Reset Password' }}
      </h2>
      <p class="mt-2  text-sm  text-secondary-600 dark:text-secondary-400">
        {{ isResetting 
          ? 'Enter your new password below' 
          : 'Enter your email address and we\'ll send you a reset link' 
        }}
      </p>
    </div>

    <!-- Success message -->
    <div v-if="showSuccess" class="bg-success-50/80 dark:bg-success-900/80 border border-success-200 dark:border-success-700 text-success-700 dark:text-success-300 px-4 py-3 rounded-lg">
      {{ successMessage }}
    </div>

    <!-- Reset request form -->
    <form v-if="!isResetting && !showSuccess" class="mt-8 space-y-6" @submit.prevent="handleResetRequest">
      <div>
        <label for="email" class="block  text-sm  font-medium text-secondary-700 dark:text-secondary-300 mb-1">
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
        <p v-if="errors.email" class="mt-1  text-sm  text-error-600 dark:text-error-400">
          {{ errors.email }}
        </p>
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
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm  text-sm  font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoading" class="loading-spinner mr-2"></span>
          {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </div>

      <!-- Back to login -->
      <div class="text-center">
        <NuxtLink to="/login" class=" text-sm  font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
          Back to Sign In
        </NuxtLink>
      </div>
    </form>

    <!-- Password update form -->
    <form v-else-if="isResetting" class="mt-8 space-y-6" @submit.prevent="handlePasswordUpdate">
      <div class="space-y-4">
        <div>
          <label for="password" class="block  text-sm  font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            New Password
          </label>
          <input
            id="password"
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="new-password"
            required
            class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            :class="{ 'border-error-300 dark:border-error-600': errors.password }"
            placeholder="Enter your new password"
          />
          <p v-if="errors.password" class="mt-1  text-sm  text-error-600 dark:text-error-400">
            {{ errors.password }}
          </p>
        </div>

        <div>
          <label for="confirmPassword" class="block  text-sm  font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            name="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            :class="{ 'border-error-300 dark:border-error-600': errors.confirmPassword }"
            placeholder="Confirm your new password"
          />
          <p v-if="errors.confirmPassword" class="mt-1  text-sm  text-error-600 dark:text-error-400">
            {{ errors.confirmPassword }}
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
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm  text-sm  font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoading" class="loading-spinner mr-2"></span>
          {{ isLoading ? 'Updating...' : 'Update Password' }}
        </button>
      </div>
    </form>

    <!-- Back to login after success -->
    <div v-if="showSuccess" class="text-center">
      <NuxtLink to="/login" class="inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm  text-sm  font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">
        Back to Sign In
      </NuxtLink>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Set page metadata
definePageMeta({
  title: 'Reset Password',
  description: 'Reset your password',
  layout: 'public'
})

// Form state
const form = reactive({
  email: '',
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  email: '',
  password: '',
  confirmPassword: ''
})

// Use auth composable
const { user, resetPassword, updatePassword, isLoading, error: authError, clearError } = useAuth()

// Component state
const showSuccess = ref(false)
const successMessage = ref('')
const route = useRoute()

// Check if we're in password reset mode (coming from email link)
const isResetting = computed(() => {
  // Check for various indicators that user came from email link
  const hasAuthTokens = !!(
    route.hash || 
    route.query.access_token || 
    route.query.refresh_token ||
    route.query.type === 'recovery' ||
    route.hash.includes('access_token') ||
    route.hash.includes('type=recovery')
  )
  
  // Also check if user is authenticated (would happen after email link processing)
  const isAuthenticated = !!user.value
  
  return hasAuthTokens || isAuthenticated
})

// Clear errors when form changes
watch(() => form.email, () => {
  errors.email = ''
  clearError()
})

watch(() => form.password, () => {
  errors.password = ''
  clearError()
})

watch(() => form.confirmPassword, () => {
  errors.confirmPassword = ''
  clearError()
})

// Form validation for reset request
const validateResetForm = () => {
  let isValid = true
  errors.email = ''
  
  if (!form.email) {
    errors.email = 'Email is required'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'Please enter a valid email address'
    isValid = false
  }
  
  return isValid
}

// Form validation for password update
const validatePasswordForm = () => {
  let isValid = true
  
  // Reset errors
  errors.password = ''
  errors.confirmPassword = ''
  
  // Password validation
  if (!form.password) {
    errors.password = 'Password is required'
    isValid = false
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
    isValid = false
  }
  
  // Confirm password validation
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
    isValid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
    isValid = false
  }
  
  return isValid
}

// Handle reset request
const handleResetRequest = async () => {
  if (!validateResetForm()) {
    return
  }
  
  const result = await resetPassword(form.email)
  
  if (result.success) {
    showSuccess.value = true
    successMessage.value = 'Password reset link sent! Check your email for instructions.'
  }
}

// Handle password update
const handlePasswordUpdate = async () => {
  if (!validatePasswordForm()) {
    return
  }
  
  const result = await updatePassword(form.password)
  
  if (result.success) {
    showSuccess.value = true
    successMessage.value = 'Password updated successfully! You can now sign in with your new password.'
  }
}

// Clear error when component mounts
onMounted(async () => {
  clearError()
  
  // Debug: Log the current route to understand what we receive from Supabase
  console.log('Password reset page loaded with:', {
    hash: route.hash,
    query: route.query,
    fullPath: route.fullPath
  })
  
  // If user has session (came from email), they're ready to reset password
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session && !showSuccess.value) {
    console.log('User has active session from email link')
    // User is authenticated via email link, show password reset form
  }
})
</script> 