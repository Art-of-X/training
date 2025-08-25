<template>
  <div class="p-8">
    <!-- Header (align with portfolio/projects) -->
    <section class="border-b-4 border-primary-500 pb-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
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

    <!-- General Settings -->
    <section class="mt-8 border-b-4 border-primary-500 pb-4">
      <h2 class="text-3xl font-bold mb-6">General Settings</h2>
      
      <div class="space-y-6">
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
            <p class="text-sm text-secondary-500 mt-1">Changing email will trigger a confirmation.</p>
          </div>
        </div>

        <div v-if="message" class="text-sm text-green-600 dark:text-green-400">{{ message }}</div>
        <div v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</div>
      </div>
    </section>

    <!-- Plans -->
    <section class="mt-8 border-b-4 border-primary-500 pb-4">
      <h2 class="text-3xl font-bold mb-6">Plans</h2>
      
      <div class="mb-8">
        <h3 class="text-xl font-semibold text-secondary-900 dark:text-white mb-2">Choose Your Plan</h3>
        <p class="text-sm text-secondary-600 dark:text-secondary-300">Select the plan that best fits your creative needs</p>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
        <!-- Free Plan -->
        <div class="relative bg-white dark:bg-secondary-800 rounded-2xl border-2 border-secondary-200 dark:border-secondary-700 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
          <div class="mb-6">
            <div class="text-4xl mb-4">🎨</div>
            <h4 class="text-xl font-bold text-secondary-900 dark:text-white mb-2">Free</h4>
            <p class="text-sm text-secondary-600 dark:text-secondary-300">Perfect for getting started</p>
          </div>
          
          <div class="space-y-4 mb-8">
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-sm text-secondary-700 dark:text-secondary-300">Up to 3 projects</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-sm text-secondary-700 dark:text-secondary-300">Up to 3 sparks per project</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-sm text-secondary-700 dark:text-secondary-300">Basic AI training</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-sm text-secondary-700 dark:text-secondary-300">Community support</span>
            </div>
          </div>
          
          <div class="mb-6">
            <div class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">$0</div>
            <p class="text-sm text-secondary-600 dark:text-secondary-300">Forever free</p>
          </div>
          
          <div v-if="plan === 'free'" class="px-6 py-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg font-medium text-center text-sm">
            Current Plan
          </div>
        </div>

        <!-- Premium Plan -->
        <div class="relative bg-white dark:bg-secondary-800 rounded-2xl border-2 border-primary-500 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
          <div class="absolute -top-4 left-8">
            <span class="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
          </div>
          
          <div class="mb-6">
            <div class="text-4xl mb-4">🚀</div>
            <h4 class="text-xl font-bold text-secondary-900 dark:text-white mb-2">Premium</h4>
            <p class="text-sm text-secondary-600 dark:text-secondary-300">For serious creators</p>
          </div>
          
          <div class="space-y-4 mb-8">
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-sm text-secondary-700 dark:text-secondary-300">Up to 10 projects</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-sm text-secondary-700 dark:text-secondary-300">Up to 8 sparks per project</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-sm text-secondary-700 dark:text-secondary-300">Advanced AI training</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-sm text-secondary-700 dark:text-secondary-300">Priority support</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
              <span class="text-sm text-secondary-700 dark:text-secondary-300">Early access to new features</span>
            </div>
          </div>
          
          <div class="mb-6">
            <div v-if="prices.length" class="mb-2">
              <div v-for="p in prices" :key="p.id" class="text-3xl font-bold text-secondary-900 dark:text-white">
                ${{ (p.unitAmount ?? 0)/100 }}/{{ p.interval || 'month' }}
              </div>
            </div>
            <p class="text-sm text-secondary-600 dark:text-secondary-300">{{ product?.description || 'Unlock your full creative potential' }}</p>
          </div>
          
          <div v-if="plan === 'premium'" class="mb-4">
            <div class="px-6 py-3 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-lg font-medium text-center text-sm">
              Current Plan
            </div>
          </div>
          
          <div v-if="plan === 'free'">
            <button 
              class="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200" 
              :disabled="isBilling" 
              @click="upgrade"
            >
              <span v-if="isBilling" class="loading-spinner mr-2" />
              {{ isBilling ? 'Redirecting...' : 'Upgrade Now' }}
            </button>
          </div>
          <div v-else>
            <button 
              class="w-full bg-secondary-200 dark:bg-secondary-700 hover:bg-secondary-300 dark:hover:bg-secondary-600 text-secondary-700 dark:text-secondary-300 font-semibold py-3 px-6 rounded-lg transition-colors duration-200" 
              :disabled="isBilling" 
              @click="manageBilling"
            >
              <span v-if="isBilling" class="loading-spinner mr-2" />
              {{ isBilling ? 'Opening...' : 'Manage Billing' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Current Plan Info -->
      <div v-if="plan === 'premium' && subscriptionId" class="text-sm text-secondary-600 dark:text-secondary-400 mt-6">
        <p>Subscription ID: {{ subscriptionId }}</p>
      </div>
    </section>

    <!-- Danger Zone -->
    <section class="mt-8">
      <h2 class="text-3xl font-bold mb-6">Danger Zone</h2>
      
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xl font-semibold">Delete All Data</h3>
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
import { useSubscription } from '~/composables/useSubscription'

const isLoading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)
const isBilling = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)

const accountForm = reactive<{ name: string; email: string }>({ name: '', email: '' })
const { plan, product, prices, subscriptionId, loadSubscription: loadSub, refresh } = useSubscription()

onMounted(async () => {
  await loadAccount()
  await loadSub(true)
  // If returning from Stripe checkout with a session id, verify and refresh plan
  const route = useRoute()
  const sessionId = (route.query.session_id as string | undefined) || undefined
  if (route.query.checkout === 'success' && sessionId) {
    try {
      const r = await $fetch<{ plan: 'free'|'premium'; subscriptionId?: string | null }>(`/api/billing/session`, { params: { id: sessionId } })
      if (r.plan === 'premium') {
        plan.value = 'premium'
        if (r.subscriptionId) subscriptionId.value = r.subscriptionId
      }
      await refresh() // Refresh subscription after successful checkout
    } catch {}
  }
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

// Subscription state is provided by useSubscription()

async function upgrade() {
  if (isBilling.value) return
  isBilling.value = true
  try {
    const r = await $fetch<{ url: string }>("/api/billing/checkout", { method: 'POST' })
    if (process.client) window.location.href = r.url
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Failed to start checkout')
  } finally {
    isBilling.value = false
  }
}

async function manageBilling() {
  if (isBilling.value) return
  isBilling.value = true
  try {
    const r = await $fetch<{ url: string }>("/api/billing/portal", { method: 'POST' })
    if (process.client) window.location.href = r.url
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Failed to open billing portal')
  } finally {
    isBilling.value = false
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
  @apply block  text-sm  font-medium text-secondary-700 dark:text-secondary-300 mb-1;
}

.form-input {
  @apply w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm;
  @apply bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500;
}

.btn-primary {
  @apply px-4 py-2 bg-primary-500 text-white font-medium rounded-md transition-colors;
  @apply hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
}

.btn-secondary {
  @apply px-4 py-2 bg-secondary-200 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 font-medium rounded-md transition-colors;
  @apply hover:bg-secondary-300 dark:hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2;
}

.btn-danger {
  @apply px-4 py-2 bg-red-600 text-white font-medium rounded-md transition-colors;
  @apply hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2;
}

.loading-spinner {
  @apply inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin;
}
</style>
