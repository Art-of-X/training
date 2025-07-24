<template>
  <div class="h-full">
    <div class="container-wide flex flex-col flex-grow min-h-0">
      <!-- Header -->
  
      <div class="flex-grow items-start overflow-hidden min-h-0 py-8">
        
        <!-- Left Column: Training Modules -->
        <div class="h-full flex flex-col">
          <div class="sticky top-0 z-10 flex items-center justify-between border-b pb-2 pt-1 bg-white dark:bg-secondary-900 mb-4 flex-shrink-0">
        <h1 class="text-2xl font-bold text-secondary-900 dark:text-white mb-2">Welcome, <span class="text-primary-500">{{ userProfile?.name || 'Artist' }}</span>. Let's train your <span class="text-primary-500 italic">spark</span>.</h1>
            
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
            <ChatComponent ref="chatRef" :embedded="true" v-show="activeTab === 'chat'" class="h-[60vh] flex flex-col" />

            <!-- Voice Agent Component -->
            <VoiceAgent ref="voiceAgentRef" :key="voiceAgentKey" v-show="activeTab === 'voice'" class="h-[60vh] flex flex-col" />

            <!-- History Tab -->
            <ChatHistoryPanel
              v-if="activeTab === 'history'"
              :loading="loadingHistory"
              :error="historyError"
              :groupedHistory="groupedHistory"
              @loadSession="loadSession"
              class="mt-6"
            />

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import ProgressBar from '~/components/ProgressBar.vue';
import ChatComponent from '~/components/Chat.vue';
import VoiceAgent from '~/components/VoiceAgent.vue';
import ChatHistoryPanel from '~/components/ChatHistoryPanel.vue';
import { useUserProfile } from '~/composables/useUserProfile';
import { useChat } from '~/composables/useChat';

definePageMeta({
  title: 'Training Dashboard'
})

const { userProfile } = useUserProfile();

// Tab state
const tabs = [
  { id: 'static', label: 'Modules' },
  { id: 'chat', label: 'Chat' },
  { id: 'voice', label: 'Voice' },
  { id: 'history', label: 'History' },
];
const activeTab = ref<'static' | 'chat' | 'voice' | 'history'>('chat');

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

// Chat history state (shared for both chat and voice)
const chatHistory = ref([]);
const loadingHistory = ref(false);
const historyError = ref(null);

const groupedHistory = computed(() => {
  const groups = {};
  chatHistory.value.forEach(session => {
    const sessionDate = new Date(session.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const sessionTime = new Date(session.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (!groups[sessionDate]) groups[sessionDate] = [];
    groups[sessionDate].push({
      id: session.id,
      title: session.title || 'Untitled Chat',
      time: sessionTime,
      messageCount: session.chatMessages.length,
      messages: session.chatMessages.map(msg => ({ role: msg.role, content: msg.content }))
    });
  });
  const sortedDates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const sortedGroups = {};
  sortedDates.forEach(date => {
    sortedGroups[date] = groups[date].sort((a, b) => {
      const timeA = new Date(`1/1/2000 ${a.time}`).getTime();
      const timeB = new Date(`1/1/2000 ${b.time}`).getTime();
      return timeB - timeA;
    });
  });
  return sortedGroups;
});

const fetchChatHistory = async () => {
  loadingHistory.value = true;
  historyError.value = null;
  try {
    const data = await $fetch('/api/chat/history');
    chatHistory.value = data;
  } catch (e) {
    historyError.value = e;
    // Optionally: show a toast or error message
  } finally {
    loadingHistory.value = false;
  }
};

// Load session into the correct component depending on active tab
const chatRef = ref();
const voiceAgentRef = ref();
const loadSession = (sessionMessages, sessionId) => {
  // Always load into chat
  if (chatRef.value?.loadSession) {
    chatRef.value.loadSession(sessionMessages, sessionId);
    activeTab.value = 'chat';
  }
};

// Fetch history when switching to history tab
watch(activeTab, (newTab) => {
  if (newTab === 'history') fetchChatHistory();
});

// Key to force VoiceAgent recreation when switching to voice tab
const voiceAgentKey = ref(0);

watch(activeTab, (newTab, oldTab) => {
  if (oldTab === 'chat' && chatRef.value?.cleanup) {
    chatRef.value.cleanup();
  }
  if (oldTab === 'voice' && voiceAgentRef.value?.cleanup) {
    voiceAgentRef.value.cleanup();
  }
  if (newTab === 'voice' && oldTab !== 'voice') {
    voiceAgentKey.value += 1; // Already present, forces re-mount
  }
  // Optionally, force re-mount for Chat as well if you want a fresh session
});
</script>

<style scoped>
/* No additional styles needed */
</style> 