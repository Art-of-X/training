<template>
  <div class="h-full p-8">
    <div class="">
      <div class="">
        <div class="">
          <div class="flex-grow min-h-0">
            <ChatComponent
              ref="chatRef"
              :embedded="true"
              v-if="activeTab === 'chat'"
              :key="activeTab"
              :spark-id="sparkId"
              class="h-full flex flex-col"
            />
            <VoiceAgent
              ref="voiceAgentRef"
              :key="voiceAgentKey"
              v-if="activeTab === 'voice'"
              class="h-full flex flex-col"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from "vue";
import ChatComponent from "~/components/Chat.vue";
import VoiceAgent from "~/components/VoiceAgent.vue";
import { useUserProfile } from "~/composables/useUserProfile";
import { useRoute, useRouter } from "#imports";

definePageMeta({
  title: "Training Dashboard",
});

const { userProfile } = useUserProfile();
const route = useRoute();
const router = useRouter();
const activeTab = ref<"chat" | "voice">("chat");
const sparkId = computed(() => (route.query.spark as string) || undefined)

function syncTabFromQuery() {
  const q = (route.query.tab as string) || "chat";
  if (q === "voice" || q === "chat") {
    activeTab.value = q;
  } else {
    activeTab.value = "chat";
  }
}

function setActiveTab(tab: "chat" | "voice") {
  activeTab.value = tab;
  const newQuery = { ...route.query, tab };
  router.replace({ query: newQuery });
}

watch(
  () => route.query.tab,
  () => syncTabFromQuery()
);

const chatRef = ref();
const voiceAgentRef = ref();
const loadSession = async (sessionMessages: any[], sessionId: string) => {
  setActiveTab("chat");
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

const voiceAgentKey = ref(0);

watch(activeTab, (newTab, oldTab) => {
  if (oldTab === "chat" && chatRef.value?.cleanup) {
    chatRef.value.cleanup();
  }
  if (oldTab === "voice" && voiceAgentRef.value?.cleanup) {
    voiceAgentRef.value.cleanup();
  }
  if (newTab === "voice" && oldTab !== "voice") {
    voiceAgentKey.value += 1;
  }
});

onMounted(async () => {
  syncTabFromQuery();
});
</script>

<style scoped>
/* No additional styles needed */
</style>
