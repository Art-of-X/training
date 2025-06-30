<template>
  <div class="min-h-screen bg-white dark:bg-secondary-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-3xl font-bold text-secondary-900 dark:text-white">
          {{ isResetting ? 'Set New Password' : 'Reset Password' }}
        </h2>
        <p class="mt-2 text-sm text-secondary-600 dark:text-secondary-300">
          {{ isResetting 
            ? 'Enter your new password below' 
            : 'Enter your email address and we\'ll send you a reset link' 
          }}
        </p>
      </div>

      <!-- Success message -->
      <div v-if="showSuccess" class="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-500/30 text-success-700 dark:text-success-300 px-4 py-3">
        {{ successMessage }}
      </div>

      <!-- Reset request form -->
      <form v-if="!isResetting && !showSuccess" class="mt-8 space-y-6" @submit.prevent="handleResetRequest">
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

        <!-- Error display -->
        <div v-if="authError" class="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-500/30 text-error-700 dark:text-error-300 px-4 py-3">
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
            {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
          </button>
        </div>

        <!-- Back to login -->
        <div class="text-center">
          <NuxtLink to="/login" class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300">
            Back to Sign In
          </NuxtLink>
        </div>
      </form>

      <!-- Password update form -->
      <form v-else-if="isResetting" class="mt-8 space-y-6" @submit.prevent="handlePasswordUpdate">
        <div class="space-y-4">
          <div>
            <label for="password" class="form-label">
              New Password
            </label>
            <input
              id="password"
              v-model="form.password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              class="form-input"
              :class="{ 'border-error-300': errors.password }"
              placeholder="Enter your new password"
            />
            <p v-if="errors.password" class="form-error">
              {{ errors.password }}
            </p>
          </div>

          <div>
            <label for="confirmPassword" class="form-label">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              class="form-input"
              :class="{ 'border-error-300': errors.confirmPassword }"
              placeholder="Confirm your new password"
            />
            <p v-if="errors.confirmPassword" class="form-error">
              {{ errors.confirmPassword }}
            </p>
          </div>
        </div>

        <!-- Error display -->
        <div v-if="authError" class="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-500/30 text-error-700 dark:text-error-300 px-4 py-3">
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
            {{ isLoading ? 'Updating...' : 'Update Password' }}
          </button>
        </div>
      </form>

      <!-- Back to login after success -->
      <div v-if="showSuccess" class="text-center">
        <NuxtLink to="/login" class="btn-primary">
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
  layout: false
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