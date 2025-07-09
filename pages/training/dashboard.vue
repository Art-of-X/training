<template>
  <div class="h-full flex flex-col">
    <div class="container-wide flex flex-col flex-grow min-h-0">
      <!-- Header -->
      <div class="text-left py-8">
        <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Welcome, <span class="text-primary-500">{{ userProfile?.name || 'Artist' }}</span>. Let's train your <span class="text-primary-500 italic">spark</span>.</h1>
        <p class="text-2xl text-secondary-600 dark:text-secondary-300">
          Start adding your portfolio and answer questions to train your personal model.
        </p>
      </div>
  
      <div class="flex-grow grid grid-cols-1 md:grid-cols-3 gap-8 items-start pb-8 overflow-hidden min-h-0">
        
        <!-- Left Column: Training Modules -->
        <div class="h-full flex flex-col">
          <div class="sticky top-0 z-10 flex items-center justify-between border-b pb-2 pt-1 bg-white dark:bg-secondary-900 mb-4 flex-shrink-0">
            <h2 class="text-2xl font-semibold text-secondary-900 dark:text-white">Training your spark</h2>
            
            <!-- Switcher -->
            <div class="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              <button 
                @click="activeTab = 'static'"
                :class="[
                  'px-3 py-1 text-sm font-medium transition-all duration-200 rounded-md',
                  activeTab === 'static' 
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm' 
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                ]"
              >
                Static
              </button>
              <button 
                @click="activeTab = 'chat'"
                :class="[
                  'px-3 py-1 text-sm font-medium transition-all duration-200 rounded-md',
                  activeTab === 'chat' 
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm' 
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                ]"
              >
                Chat
              </button>
            </div>
          </div>

          <div class="flex-grow min-h-0" :class="{'overflow-y-auto': activeTab === 'static'}">
            <!-- Static Training Cards -->
            <div v-if="activeTab === 'static'" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <!-- Portfolio Card -->
              <NuxtLink to="/training/portfolio" class="block hover:opacity-80 transition-opacity">
                <div class="h-full">
                  <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Portfolio</h3>
                  <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                    Share your work through links and PDF uploads.
                  </p>
                  <div class="mt-3" v-if="progressData">
                    <ProgressBar label="Works" :completed="progressData.portfolio.completed" :total="progressData.portfolio.total" />
                  </div>
                </div>
              </NuxtLink>

              <!-- Monologue Card -->
              <NuxtLink to="/training/monologue" class="block hover:opacity-80 transition-opacity">
                <div class="h-full">
                  <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Monologue</h3>
                  <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                    Answer questions about you and your work.
                  </p>
                  <div class="mt-3" v-if="progressData">
                    <ProgressBar label="Answered" :completed="progressData.monologue.completed" :total="progressData.monologue.total" />
                  </div>
                </div>
              </NuxtLink>

              <!-- Creativity Benchmarking Card -->
              <div class="block cursor-not-allowed opacity-60">
                <div class="h-full">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Creativity</h3>
                    <span class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
                  </div>
                  <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                    Engage in standardized tests to measure and understand your creative potential.
                  </p>
                </div>
              </div>

              <!-- Demographics Card -->
              <div class="block cursor-not-allowed opacity-60">
                <div class="h-full">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Demographics</h3>
                    <span class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
                  </div>
                  <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                    Share your background information to help us understand your creative context.
                  </p>
                </div>
              </div>

              <!-- Peer Training Card -->
              <div class="block cursor-not-allowed opacity-60">
                <div class="h-full">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Peer Training</h3>
                    <span class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
                  </div>
                  <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                    Engage with other artists to discuss your work and other topics.
                  </p>
                </div>
              </div>

              <!-- Observation Card -->
              <div class="block cursor-not-allowed opacity-60">
                <div class="h-full">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Observation</h3>
                    <span class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
                  </div>
                  <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                    Capture your working process.
                  </p>
                </div>
              </div>
            </div>

            <!-- Chat Component -->
            <div v-show="activeTab === 'chat'" class="h-[60vh] flex flex-col">
              <Chat :embedded="true" />
            </div>
          </div>
        </div>

        <!-- Center Column: 3D X -->
        <div class="hidden md:flex items-center justify-center h-full">
          <DashboardX />
        </div>

        <!-- Right Column: Using your AI -->
        <div class="h-full overflow-y-auto">
          <h2 class="sticky top-0 z-10 text-2xl font-semibold text-secondary-900 dark:text-white mb-4 border-b pb-2 pt-1 bg-white dark:bg-secondary-900">Using your AI</h2>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- API Card -->
            <div class="block cursor-not-allowed opacity-60">
              <div class="h-full">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">API</h3>
                  <span class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
                </div>
                <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                  Integrate your model into your own applications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DashboardX from '~/components/DashboardX.vue';
import ProgressBar from '~/components/ProgressBar.vue';
import Chat from '~/components/Chat.vue';
import { useUserProfile } from '~/composables/useUserProfile';

definePageMeta({
  title: 'Training Dashboard'
})

const { userProfile } = useUserProfile();

// Tab state
const activeTab = ref<'static' | 'chat'>('static');

interface Progress {
  completed: number;
  total: number;
}

interface ProgressData {
  portfolio: Progress;
  monologue: Progress;
  creativity: Progress;
  demographics: Progress;
}

const progressData = ref<ProgressData | null>(null);

const loadProgress = async () => {
  try {
    const data = await $fetch<ProgressData>('/api/user/progress');
    progressData.value = data;
  } catch (error) {
    console.error('Failed to load progress data:', error);
  }
};

// Load progress on mount
onMounted(() => {
  loadProgress();
})

// If you have a user watcher for progress, you can keep it
const user = useSupabaseUser()
watch(user, () => {
  loadProgress();
})
</script>

<style scoped>
/* No additional styles needed */
</style> 