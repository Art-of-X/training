<template>
  <div class="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <h2 class="text-3xl font-bold text-secondary-900">
          Create your account
        </h2>
        <p class="mt-2 text-sm text-secondary-600">
          Start your creative DNA training journey
        </p>
      </div>

      <!-- Sign up form -->
      <form class="mt-8 space-y-6" @submit.prevent="handleSignUp">
        <div class="space-y-4">
          <div>
            <label for="name" class="form-label">
              Full Name
            </label>
            <input
              id="name"
              v-model="form.name"
              name="name"
              type="text"
              autocomplete="name"
              required
              class="form-input"
              :class="{ 'border-error-300': errors.name }"
              placeholder="Enter your full name"
            />
            <p v-if="errors.name" class="form-error">
              {{ errors.name }}
            </p>
          </div>

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
              autocomplete="new-password"
              required
              class="form-input"
              :class="{ 'border-error-300': errors.password }"
              placeholder="Create a strong password"
            />
            <p v-if="errors.password" class="form-error">
              {{ errors.password }}
            </p>
          </div>

          <div>
            <label for="confirmPassword" class="form-label">
              Confirm Password
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
              placeholder="Confirm your password"
            />
            <p v-if="errors.confirmPassword" class="form-error">
              {{ errors.confirmPassword }}
            </p>
          </div>
        </div>

        <!-- Error display -->
        <div v-if="authError" class="bg-error-50 border border-error-200 text-error-700 px-4 py-3">
          {{ authError }}
        </div>

        <!-- Terms notice -->
        <div class="text-xs text-secondary-500">
          By creating an account, you agree to our secure data handling practices for AI training purposes.
        </div>

        <!-- Submit button -->
        <div>
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full btn-primary"
          >
            <span v-if="isLoading" class="loading-spinner mr-2"></span>
            {{ isLoading ? 'Creating account...' : 'Create account' }}
          </button>
        </div>

        <!-- Link to sign in -->
        <div class="text-center">
          <p class="text-sm text-secondary-600">
            Already have an account?
            <NuxtLink to="/login" class="font-medium text-primary-600 hover:text-primary-500">
              Sign in
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
  title: 'Sign Up',
  description: 'Create your Artificial Artistic Thinking account',
  layout: false
})

// Form state
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
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
  
  return isValid
}

// Handle form submission
const handleSignUp = async () => {
  if (!validateForm()) {
    return
  }
  
  const result = await signUp(form.email, form.password, form.name)
  
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