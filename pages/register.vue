<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="text-center">
      <h2 class="text-3xl font-bold text-secondary-900 dark:text-white">
        Create your account
      </h2>
      <p class="mt-2 text-sm text-secondary-600 dark:text-secondary-400">
        Start your training journey
      </p>
    </div>

    <!-- Sign up form -->
    <form class="mt-8 space-y-6" @submit.prevent="handleSignUp">
      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Full Name
          </label>
          <input
            id="name"
            v-model="form.name"
            name="name"
            type="text"
            autocomplete="name"
            required
            class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            :class="{ 'border-error-300 dark:border-error-600': errors.name }"
            placeholder="Enter your full name"
          />
          <p v-if="errors.name" class="mt-1 text-sm text-error-600 dark:text-error-400">
            {{ errors.name }}
          </p>
        </div>

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
            autocomplete="new-password"
            required
            class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            :class="{ 'border-error-300 dark:border-error-600': errors.password }"
            placeholder="Create a strong password"
          />
          <p v-if="errors.password" class="mt-1 text-sm text-error-600 dark:text-error-400">
            {{ errors.password }}
          </p>
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Confirm Password
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
            placeholder="Confirm your password"
          />
          <p v-if="errors.confirmPassword" class="mt-1 text-sm text-error-600 dark:text-error-400">
            {{ errors.confirmPassword }}
          </p>
        </div>

        <div>
          <label for="accessCode" class="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Access Code
          </label>
          <input
            id="accessCode"
            v-model="form.accessCode"
            name="accessCode"
            type="text"
            required
            class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            :class="{ 'border-error-300 dark:border-error-600': errors.accessCode }"
            placeholder="Enter your access code"
          />
          <p v-if="errors.accessCode" class="mt-1 text-sm text-error-600 dark:text-error-400">
            {{ errors.accessCode }}
          </p>
        </div>
      </div>

      <!-- Error display -->
      <div v-if="authError" class="bg-error-50/80 dark:bg-error-900/80 border border-error-200 dark:border-error-700 text-error-700 dark:text-error-300 px-4 py-3 rounded-lg">
        {{ authError }}
      </div>

      <!-- Terms notice -->
      <div class="text-xs text-secondary-500 dark:text-secondary-400">
        By creating an account, you agree to our secure data handling practices for AI training purposes.
      </div>

      <!-- Submit button -->
      <div>
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isLoading" class="loading-spinner mr-2"></span>
          {{ isLoading ? 'Creating account...' : 'Create account' }}
        </button>
      </div>

      <!-- Link to sign in -->
      <div class="text-center">
        <p class="text-sm text-secondary-600 dark:text-secondary-400">
          Already have an account?
          <NuxtLink to="/login" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
            Sign in
          </NuxtLink>
        </p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
// Set page metadata
definePageMeta({
  title: 'Sign Up',
  description: 'Create your Artistic AI account',
  layout: 'public'
})

// Form state
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  accessCode: ''
})

const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  accessCode: ''
})

// Use auth composable
const { signUp, isLoading, error: authError, clearError } = useAuth()

// Clear errors when form changes
watch(() => form.name, () => {
  errors.name = ''
  clearError()
})

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

watch(() => form.accessCode, () => {
  errors.accessCode = ''
  clearError()
})

// Form validation
const validateForm = () => {
  let isValid = true
  
  // Reset errors
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = ''
  })
  
  // Name validation
  if (!form.name) {
    errors.name = 'Name is required'
    isValid = false
  } else if (form.name.length < 2 || form.name.length > 100) {
    errors.name = 'Name must be between 2 and 100 characters'
    isValid = false
  }
  
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

  // Access code validation
  if (!form.accessCode) {
    errors.accessCode = 'Access code is required'
    isValid = false
  }
  
  return isValid
}

// Handle form submission
const handleSignUp = async () => {
  if (!validateForm()) {
    return
  }
  
  const result = await signUp(form.email, form.password, form.name, form.accessCode)
  
  if (result.success) {
    // Show success message and redirect to confirmation page
    await navigateTo('/confirm?message=Please check your email to confirm your account')
  }
}

// Clear error when component mounts
onMounted(() => {
  clearError()
})
</script> 