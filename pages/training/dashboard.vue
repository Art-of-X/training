<template>
  <div class="py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Welcome, <span class="rainbow-text">{{ userProfile?.name || 'Artist' }}</span>. Let's train your <span class="rainbow-text">AI</span>.</h1>
      <p class="text-lg text-secondary-600 dark:text-secondary-300">
        Complete the following modules to train the artistic AI on your unique creative DNA.
      </p>
    </div>

    <!-- Training Section -->
    <div class="mb-12">
      <h2 class="text-2xl font-semibold text-secondary-900 dark:text-white mb-4 border-b pb-2">Training your AI</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Portfolio Card -->
        <NuxtLink to="/training/portfolio" class="card-link-wrapper">
          <div class="card h-full">
            <div class="card-body">
              <h3 class="text-xl font-semibold text-secondary-900 dark:text-white">Portfolio</h3>
              <p class="text-secondary-600 dark:text-secondary-300 mt-2">
                Share your work through links and PDF uploads.
              </p>
            </div>
          </div>
        </NuxtLink>

        <!-- Monologue Card -->
        <NuxtLink to="/training/monologue" class="card-link-wrapper">
          <div class="card h-full">
            <div class="card-body">
              <h3 class="text-xl font-semibold text-secondary-900 dark:text-white">Monologue</h3>
              <p class="text-secondary-600 dark:text-secondary-300 mt-2">
                Answer questions about you and your work.
              </p>
            </div>
          </div>
        </NuxtLink>

        <!-- Creativity Benchmarking Card -->
        <NuxtLink to="/training/creativity-benchmarking" class="card-link-wrapper">
          <div class="card h-full">
            <div class="card-body">
              <h3 class="text-xl font-semibold text-secondary-900 dark:text-white">Creativity</h3>
              <p class="text-secondary-600 dark:text-secondary-300 mt-2">
                Engage in standardized tests to measure and understand your creative potential.
              </p>
            </div>
          </div>
        </NuxtLink>

        <!-- Demographics Card -->
        <NuxtLink to="/training/demographics" class="card-link-wrapper">
          <div class="card h-full">
            <div class="card-body">
              <h3 class="text-xl font-semibold text-secondary-900 dark:text-white">Demographics</h3>
              <p class="text-secondary-600 dark:text-secondary-300 mt-2">
                Share your background information to help us understand your creative context.
              </p>
            </div>
          </div>
        </NuxtLink>

        <!-- Peer Training Card -->
        <div class="card-link-wrapper-disabled">
          <div class="card h-full relative">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-semibold text-secondary-900 dark:text-white">Peer Training</h3>
                <span class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
              </div>
              <p class="text-secondary-600 dark:text-secondary-300 mt-2">
                Engage with other artists to discuss your work and other topics.
              </p>
            </div>
          </div>
        </div>

        <!-- Observation Card -->
        <div class="card-link-wrapper-disabled">
          <div class="card h-full relative">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-semibold text-secondary-900 dark:text-white">Observation</h3>
                <span class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
              </div>
              <p class="text-secondary-600 dark:text-secondary-300 mt-2">
                Capture your working process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Your Spark Section -->
    <div class="mb-12">
      <h2 class="text-2xl font-semibold text-secondary-900 dark:text-white mb-4 border-b pb-2">Using your AI</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Chat Card -->
        <div class="card-link-wrapper-disabled">
          <div class="card h-full relative">
            <div class="card-body">
               <div class="flex items-center justify-between">
                  <h3 class="text-xl font-semibold text-secondary-900 dark:text-white">Chat</h3>
                  <span class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
               </div>
              <p class="text-secondary-600 dark:text-secondary-300 mt-2">
                Interact with your trained model in a conversational format.
              </p>
            </div>
          </div>
        </div>
        <!-- API Card -->
        <div class="card-link-wrapper-disabled">
          <div class="card h-full relative">
            <div class="card-body">
               <div class="flex items-center justify-between">
                  <h3 class="text-xl font-semibold text-secondary-900 dark:text-white">API</h3>
                  <span class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
               </div>
              <p class="text-secondary-600 dark:text-secondary-300 mt-2">
                Integrate your model into your own applications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Policy Section -->
    <div>
      <h2 class="text-2xl font-semibold text-secondary-900 dark:text-white mb-4 border-b pb-2">Policy</h2>
      <div class="card">
        <div class="card-body">
          <p class="text-secondary-600 dark:text-secondary-300">
            Read about the context of this experiment and our data usage policy.
          </p>
          <button @click="openPolicyModal" class="btn-primary mt-4">Read Policy</button>
        </div>
      </div>
    </div>

    <!-- Policy Modal -->
    <PolicyModal 
      :isOpen="isPolicyModalOpen" 
      @close="closePolicyModal"
      @accept="handlePolicyAccept"
    />

  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Training Dashboard'
})

// Get user and profile data
const user = useSupabaseUser()

interface UserProfile {
  name?: string
  email?: string
  id?: string
}

const userProfile = ref<UserProfile | null>(null)

// Policy modal state
const isPolicyModalOpen = ref(false)

// Load user profile
const loadUserProfile = async () => {
  if (user.value) {
    try {
      const data = await $fetch<UserProfile>(`/api/user/profile/${user.value.id}`)
      userProfile.value = data
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }
}

// Policy modal handlers
const openPolicyModal = () => {
  isPolicyModalOpen.value = true
}

const closePolicyModal = () => {
  isPolicyModalOpen.value = false
}

const handlePolicyAccept = () => {
  // Handle policy acceptance if needed
  console.log('Policy accepted')
  closePolicyModal()
}

// Load profile on mount and when user changes
onMounted(loadUserProfile)
watch(user, loadUserProfile)
</script>

<style scoped>
.card-link-wrapper {
  @apply block transition-transform transform hover:-translate-y-1;
}
.card-link-wrapper-disabled {
  @apply block cursor-not-allowed opacity-60;
}
.card {
  @apply bg-white border border-secondary-200 shadow-sm dark:bg-secondary-800 dark:border-secondary-700;
}
.card-body {
  @apply p-6;
}
.btn-primary {
    @apply bg-primary-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-primary-700 transition-colors;
}

.rainbow-text {
  background: linear-gradient(120deg, #3b82f6, #a855f7, #ec4899, #22d3ee);
  background-size: 300% 300%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: water-flow 15s ease-in-out infinite;
}

@keyframes water-flow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style> 