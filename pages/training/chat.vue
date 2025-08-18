<template>
  <div class="h-full p-8">
    <section class="pb-4 mb-6 relative">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-3xl font-bold">Training</h1>
        <div v-if="progressPercent < 100" class="text-sm font-medium text-secondary-700 dark:text-secondary-300">
          <span>{{ displayPercent }}% until your own spark</span>
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
            <ChatComponent
              ref="chatRef"
              :embedded="true"
              :spark-id="sparkId"
              class="h-full flex flex-col"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
  </template>

<script setup lang="ts">
import { ref, nextTick, computed } from "vue";
import ChatComponent from "~/components/Chat.vue";
import { useRoute } from "#imports";
import { useTrainingProgress } from "~/composables/useTrainingProgress";

definePageMeta({
  title: "Training Dashboard",
});

const route = useRoute();
const sparkId = computed(() => (route.query.spark as string) || undefined)

// Progress state
const { progressPercent } = useTrainingProgress(sparkId)
const displayPercent = computed(() => String(progressPercent.value).padStart(2, '0'))

const chatRef = ref();
const loadSession = async (sessionMessages: any[], sessionId: string) => {
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