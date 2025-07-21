<template>
  <div class="h-full">
    <div class="container-wide flex flex-col flex-grow min-h-0">
      <!-- Header -->
      <div class="text-left py-8">
        <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Welcome, <span class="text-primary-500">{{ userProfile?.name || 'Artist' }}</span>. Let's train your <span class="text-primary-500 italic">spark</span>.</h1>
        <p class="text-2xl text-secondary-600 dark:text-secondary-300">
          Start adding your portfolio and answer questions to train your personal model.
        </p>
      </div>
  
      <div class="flex-grow items-start pb-8 overflow-hidden min-h-0">
        
        <!-- Left Column: Training Modules -->
        <div class="h-full flex flex-col">
          <div class="sticky top-0 z-10 flex items-center justify-between border-b pb-2 pt-1 bg-white dark:bg-secondary-900 mb-4 flex-shrink-0">
            <h2 class="text-2xl font-semibold text-secondary-900 dark:text-white">Training your spark</h2>
            
            <!-- Switcher -->
            <div class="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              <button 
                v-for="tab in tabs"
                :key="tab.id"
                @click="activeTab = tab.id"
                :class="[
                  'px-3 py-1 text-sm font-medium transition-all duration-200 rounded-md capitalize',
                  activeTab === tab.id 
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm' 
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                ]"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <div class="flex-grow min-h-0" :class="{'overflow-y-auto': activeTab === 'static'}">
            <!-- Static Training Cards -->
            <div v-if="activeTab === 'static'" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <template v-for="module in trainingModules" :key="module.name">
                <NuxtLink v-if="module.enabled" :to="module.link" class="block hover:opacity-80 transition-opacity">
                  <div class="h-full">
                    <div class="flex items-center justify-between">
                      <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">{{ module.name }}</h3>
                    </div>
                    <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                      {{ module.description }}
                    </p>
                    <div class="mt-3" v-if="module.progress">
                      <ProgressBar :label="module.progressLabel" :completed="module.progress.completed" :total="module.progress.total" />
                    </div>
                  </div>
                </NuxtLink>
                <div v-else class="block cursor-not-allowed opacity-60">
                   <div class="h-full">
                    <div class="flex items-center justify-between">
                      <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">{{ module.name }}</h3>
                      <span v-if="!module.enabled" class="text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 px-2 py-1">SOON</span>
                    </div>
                    <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1">
                      {{ module.description }}
                    </p>
                  </div>
                </div>
              </template>
            </div>

            <!-- Chat Component -->
            <div v-show="activeTab === 'chat'" class="h-[60vh] flex flex-col">
              <ChatComponent :embedded="true" />
            </div>

            <!-- Voice Agent Component -->
            <div v-show="activeTab === 'voice'" class="h-[60vh] flex flex-col">
              <VoiceAgent :key="voiceAgentKey" />
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ProgressBar from '~/components/ProgressBar.vue';
import ChatComponent from '~/components/Chat.vue';
import VoiceAgent from '~/components/VoiceAgent.vue';
import { useUserProfile } from '~/composables/useUserProfile';

definePageMeta({
  title: 'Training Dashboard'
})

const { userProfile } = useUserProfile();

// Tab state
const tabs = [
  { id: 'static', label: 'Modules' },
  { id: 'chat', label: 'Chat' },
  { id: 'voice', label: 'Voice' },
];
const activeTab = ref<'static' | 'chat' | 'voice'>('voice');

interface Progress {
  completed: number;
  total: number;
}

interface ProgressData {
  portfolio: Progress;
  creativity: Progress;
  demographics: Progress;
}

const progressData = ref<ProgressData | null>(null);

const trainingModules = computed(() => [
  { 
    name: 'Portfolio',
    description: 'Share your work through links and PDF uploads.',
    link: '/training/portfolio',
    enabled: true,
    progress: progressData.value?.portfolio,
    progressLabel: 'Works'
  },
  {
    name: 'Creativity',
    description: 'Engage in standardized tests to measure and understand your creative potential.',
    link: '/training/creativity-benchmarking',
    enabled: true,
    progress: progressData.value?.creativity,
    progressLabel: 'Tests'
  },
  {
    name: 'Demographics',
    description: 'Share your background information to help us understand your creative context.',
    link: '/training/demographics',
    enabled: false,
    progress: progressData.value?.demographics,
    progressLabel: 'Answered'
  },
  {
    name: 'Peer Training',
    description: 'Engage with other artists to discuss your work and other topics.',
    link: '/training/peer-training',
    enabled: false,
  },
  {
    name: 'Observation',
    description: 'Capture your working process.',
    link: '/training/observation',
    enabled: false,
  }
]);

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

// Key to force VoiceAgent recreation when switching to voice tab
const voiceAgentKey = ref(0);

watch(activeTab, (newTab, oldTab) => {
  if (newTab === 'voice' && oldTab !== 'voice') {
    // Force VoiceAgent to recreate when switching to voice tab
    voiceAgentKey.value += 1;
  }
});
</script>

<style scoped>
/* No additional styles needed */
</style> 