import type { User } from '@supabase/supabase-js'

export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  
  // Reactive authentication state
  const isAuthenticated = computed(() => !!user.value)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const config = useRuntimeConfig()
      const origin = process.client ? window.location.origin : config.public.siteUrl
      const redirectUrl = `${origin}/confirm`

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        }
      })
      
      if (signUpError) {
        error.value = signUpError.message
        return { success: false, error: signUpError.message }
      }
      
      // Create user profile after successful signup
      if (data.user) {
        await $fetch('/api/auth/create-profile', {
          method: 'POST',
          body: {
            userId: data.user.id,
            name
          }
        })
      }
      
      return { success: true, data }
    } catch (err: any) {
      error.value = err.message || 'An error occurred during sign up'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (signInError) {
        error.value = signInError.message
        return { success: false, error: signInError.message }
      }
      
      return { success: true, data }
    } catch (err: any) {
      error.value = err.message || 'An error occurred during sign in'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Sign out
  const signOut = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        error.value = signOutError.message
        return { success: false, error: signOutError.message }
      }
      
      await navigateTo('/login')
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'An error occurred during sign out'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Reset password
  const resetPassword = async (email: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      // Get the current origin, fallback to localhost for development
      const origin = process.client ? window.location.origin : 'http://localhost:3000'
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/password-reset`
      })
      
      if (resetError) {
        error.value = resetError.message
        return { success: false, error: resetError.message }
      }
      
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'An error occurred during password reset'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Update password
  const updatePassword = async (password: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password
      })
      
      if (updateError) {
        error.value = updateError.message
        return { success: false, error: updateError.message }
      }
      
      return { success: true }
    } catch (err: any) {
      error.value = err.message || 'An error occurred during password update'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    // State
    user: readonly(user),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Actions
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    clearError
  }
} 