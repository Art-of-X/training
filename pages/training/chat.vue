<template>
  <div class="h-full p-8">
    <div v-if="!allSparksResp">
      <PageLoader />
    </div>
    <div v-else>
      <section class="pb-4 mb-6 relative">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <h1 class="text-3xl font-bold">Training</h1>
          <div class="flex items-center gap-4">
            <div v-if="progressPercent < 100" class=" text-sm  font-medium text-secondary-700 dark:text-secondary-300">
              <span>{{ displayPercent }}% until your own spark</span>
            </div>
            <button @click="openHistoryModal" class="btn-secondary">Chat History</button>
          </div>
        </div>
        <!-- Progress border overlay -->
        <div class="absolute left-0 right-0 bottom-0 h-1 bg-secondary-200 dark:bg-secondary-700">
          <div
            class="h-full bg-primary-500 transition-all duration-500"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>
      </section>
      <div class="">
        <div class="">
          <div class="">
            <div class="flex-grow min-h-0">
              <ChatComponent ref="chatRef" :embedded="true" class="h-full flex flex-col" />
            </div>
          </div>
        </div>
      </div>

      <!-- History Modal -->
      <transition name="fade-transform">
        <div v-if="isHistoryModalOpen" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="closeHistoryModal" />
          <div class="relative w-full max-w-2xl bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg">
            <ChatHistoryPanel
              :loading="historyLoading"
              :error="historyError"
              :groupedHistory="groupedHistory"
              @loadSession="handleLoadSession"
            />
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from "vue";
import ChatComponent from "~/components/Chat.vue";
import PageLoader from '~/components/common/PageLoader.vue'
import ChatHistoryPanel from "~/components/ChatHistoryPanel.vue";
import { useRoute } from "#imports";
import { useTrainingProgress } from "~/composables/useTrainingProgress";
import { useUserProfile } from "~/composables/useUserProfile";

definePageMeta({
  title: "Training Dashboard",
});

const route = useRoute();
const { userProfile } = useUserProfile();

// History Modal State
const isHistoryModalOpen = ref(false);
const { data: chatHistory, pending: historyLoading, error: historyError, refresh: refreshHistory } = useAsyncData('chatHistory', () => $fetch('/api/chat/history'), {
  server: false,
  lazy: true,
  immediate: false,
})

const openHistoryModal = () => {
  refreshHistory();
  isHistoryModalOpen.value = true;
};
const closeHistoryModal = () => {
  isHistoryModalOpen.value = false;
};

const groupedHistory = computed(() => {
    if (!chatHistory.value) return {};
    return (chatHistory.value as any[]).reduce((acc, session) => {
        const sessionDate = new Date(session.createdAt);
        const date = sessionDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        const time = sessionDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        if (!acc[date]) {
            acc[date] = [];
        }

        acc[date].push({
            id: session.id,
            title: session.title || `Chat from ${date}`,
            time: time,
            messageCount: session.chatMessages.length,
            messages: session.chatMessages,
        });
        return acc;
    }, {} as Record<string, any[]>);
});

const handleLoadSession = (sessionMessages: any[], sessionId: string) => {
  loadSession(sessionMessages, sessionId);
  closeHistoryModal();
};

// Resolve the user's single Spark ID (fallback when no ?spark= is provided)
type SparkRecord = { id: string; userId?: string | null };
const { data: allSparksResp } = useFetch<{ data: SparkRecord[] }>(() => "/api/spark", { server: false });
const userSparkId = computed<string | undefined>(() => {
  const uid = userProfile.value?.id;
  const list = allSparksResp.value?.data || [];
  if (!uid) return undefined;
  return list.find(s => s.userId === uid)?.id || undefined;
});

const sparkId = computed<string | undefined>(() => (route.query.spark as string) || userSparkId.value)

// Progress state
const { progressPercent } = useTrainingProgress(sparkId)
const displayPercent = computed(() => Math.floor(progressPercent.value))

const chatRef = ref();
const loadSession = async (sessionMessages: any[], sessionId:string) => {
  await nextTick();
  const normalizedMessages = sessionMessages.map((msg) => {
    let content = msg.content;
    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch (e) {
        // Not JSON, keep as string
      }
    }
    return { ...msg, content };
  });

  if (chatRef.value?.loadSession) {
    chatRef.value.loadSession(normalizedMessages, sessionId);
  } else {
    console.error(
      "[Dashboard] Error: chatRef or loadSession not available after tab switch."
    );
  }
};
</script>

<style scoped>
/* No additional styles needed */
</style>