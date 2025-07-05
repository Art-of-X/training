import { ref, watch, onMounted } from 'vue'

interface UserProfile {
  name?: string
  email?: string
  id?: string
}

// Global state
const userProfile = ref<UserProfile | null>(null)
const isLoadingProfile = ref(true)

export function useUserProfile() {
  const user = useSupabaseUser()

  async function fetchProfile() {
    if (!user.value) {
      userProfile.value = null
      isLoadingProfile.value = false
      return
    }

    // Only fetch if profile is not already loaded for the current user
    if (userProfile.value && userProfile.value.id === user.value.id) {
        isLoadingProfile.value = false
        return
    }

    isLoadingProfile.value = true
    try {
      const response = await $fetch<{ data: UserProfile }>(`/api/user/profile/${user.value.id}`)
      userProfile.value = response.data
    } catch (error) {
      console.error('Failed to load user profile:', error)
      userProfile.value = null
    } finally {
      isLoadingProfile.value = false
    }
  }

  onMounted(() => {
      fetchProfile()
  })

  watch(user, (newUser, oldUser) => {
    if (newUser?.id !== oldUser?.id) {
      fetchProfile()
    }
  })

  return { userProfile, isLoadingProfile }
} 