<template>
  <div class="p-8 space-y-8">
    <!-- Header (align with portfolio/projects) -->
    <section class="border-b-4 border-primary-500 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">Settings</h1>
        <button
          class="btn-primary"
          :disabled="isSaving || isLoading"
          @click="savePreferences"
        >
          <span v-if="isSaving" class="loading-spinner mr-2" />
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </section>

    <!-- Account Form: Display Name & Email -->
    <section class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="md:col-span-1">
          <label class="form-label" for="display-name">Display Name</label>
          <input
            id="display-name"
            type="text"
            class="form-input w-full mt-1"
            v-model="accountForm.name"
            :disabled="isLoading"
            placeholder="Your name as visible in the app"
          />
        </div>
        <div class="md:col-span-1">
          <label class="form-label" for="email">Email</label>
          <input
            id="email"
            type="email"
            class="form-input w-full mt-1"
            v-model="accountForm.email"
            :disabled="isLoading"
            placeholder="name@example.com"
          />
          <p class="text-xs text-secondary-500 mt-1">Changing email will trigger a confirmation.</p>
        </div>
      </div>

      <div v-if="message" class="text-sm text-green-600 dark:text-green-400">{{ message }}</div>
      <div v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</div>
    </section>

    <!-- Danger Zone -->
    <section class="border-t border-secondary-200 dark:border-secondary-700 pt-6">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xl font-semibold">Danger Zone</h2>
        <button
          class="btn-danger"
          :disabled="isDeleting"
          @click="deleteAll"
        >
          <span v-if="isDeleting" class="loading-spinner mr-2" />
          {{ isDeleting ? 'Deleting...' : 'Delete All Data' }}
        </button>
      </div>
      <p class="text-sm text-secondary-600 dark:text-secondary-300">
        This removes all projects, ideas, sparks, patterns, chats, portfolio, demographics and recordings. This cannot be undone.
      </p>
    </section>
  </div>
  
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Settings',
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()
import { useUserProfile } from '~/composables/useUserProfile'
const { userProfile } = useUserProfile()

const isLoading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)

const accountForm = reactive<{ name: string; email: string }>({ name: '', email: '' })

onMounted(async () => {
  await loadAccount()
})

watch(user, async (u) => {
  if (u) await loadAccount()
})

async function loadAccount() {
  if (!user.value) { isLoading.value = false; return }
  error.value = null
  message.value = null
  try {
    const profile = await $fetch<{ data: { id: string; name: string } }>(`/api/user/profile/${user.value.id}`)
    accountForm.name = profile.data?.name || ''
    accountForm.email = user.value.email || ''
  } catch (e: any) {
    error.value = e?.data?.message || 'Failed to load account'
  } finally {
    isLoading.value = false
  }
}

async function savePreferences() {
  if (!user.value || isSaving.value) return
  isSaving.value = true
  error.value = null
  message.value = null
  try {
    // 1) Update display name in profile
    await $fetch(`/api/user/profile`, { method: 'PUT', body: { name: accountForm.name } })
    // Immediately reflect in global profile state
    if (userProfile.value) {
      userProfile.value = { ...userProfile.value, name: accountForm.name }
    } else {
      userProfile.value = { id: user.value.id, name: accountForm.name }
    }

    // 2) Update email if changed
    const currentEmail = user.value.email || ''
    if (accountForm.email && accountForm.email !== currentEmail) {
      const { error: updateError } = await supabase.auth.updateUser({ email: accountForm.email })
      if (updateError) throw updateError
    }
    message.value = 'Saved'
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to save account'
  } finally {
    isSaving.value = false
  }
}

async function deleteAll() {
  if (!user.value || isDeleting.value) return
  const confirmed = confirm('Delete ALL your data? This cannot be undone.')
  if (!confirmed) return
  isDeleting.value = true
  error.value = null
  message.value = null
  try {
    await $fetch(`/api/user/delete-all`, { method: 'POST' })
    await supabase.auth.signOut()
    await navigateTo('/login')
  } catch (e: any) {
    error.value = e?.data?.message || 'Failed to delete all data'
  } finally {
    isDeleting.value = false
  }
}
</script>

<style scoped>
.form-label {
  @apply block text-sm font-medium text-secondary-700 dark:text-secondary-300;
}
.form-input {
  @apply bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-700 rounded-lg px-3 py-2 text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500;
}
.form-select {
  @apply bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-700 rounded-lg px-3 py-2 text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500;
}
.form-checkbox {
  @apply h-4 w-4 text-primary-600 border-secondary-300 dark:border-secondary-600 rounded;
}
.btn-primary {
  @apply inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply inline-flex items-center justify-center h-10 px-4 rounded-lg bg-secondary-200 dark:bg-secondary-700 text-secondary-900 dark:text-white hover:bg-secondary-300 dark:hover:bg-secondary-600 transition;
}
.btn-danger {
  @apply inline-flex items-center justify-center h-10 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed;
}
.loading-spinner {
  @apply w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin;
}
</style>
