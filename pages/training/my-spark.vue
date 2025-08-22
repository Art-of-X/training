<template>
  <div class="h-full flex flex-col overflow-hidden bg-white dark:bg-secondary-900">
    <div v-if="isPageLoading" class="p-8">
      <PageLoader />
    </div>
    <div v-else class="h-full flex flex-col overflow-hidden">
      <!-- Graph section full width -->
      <div class="flex-grow relative min-h-0 overflow-hidden w-full">
        <div v-if="!isEligible" class="container-wide py-8">
          <div
            class="bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg p-6 text-secondary-800 dark:text-secondary-200"
          >
            <h2 class=" text-sm  font-semibold mb-2">Keep training to unlock your spark</h2>
            <p class=" text-sm ">
              You need at least 3 methods and 3 competencies analyzed. Current: {{ uniqueMethodsCount }}/3 methods, {{
                uniqueCompetenciesCount
              }}/3 competencies.
            </p>
          </div>
        </div>
        <div v-else-if="userProfile?.id" class="absolute inset-0">
          <UserPatternGraph v-if="viewMode === 'chart'" :userId="userProfile.id" />
          <AllUsersNetwork v-else />
        </div>
        <p v-else class="text-secondary-600 dark:text-secondary-400 flex items-center justify-center h-full">
          Loading user profile to display mental model...
        </p>
      </div>

      <!-- Fullscreen overlay -->
      <div v-if="isFullscreen" class="fixed inset-0 z-50 bg-white dark:bg-secondary-900">
        <div class="absolute top-4 right-4 flex items-center space-x-3">
          <button
            @click="isFullscreen = false"
            class="px-3 py-1  text-sm  font-medium rounded-md border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-800"
          >
            Close
          </button>
        </div>
        <div class="absolute inset-0">
          <UserPatternGraph v-if="userProfile?.id && viewMode === 'chart'" :userId="userProfile.id" />
          <AllUsersNetwork v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports';
import { ref, watch, onMounted, computed } from 'vue';
import UserPatternGraph from '~/components/UserPatternGraph.vue';
import AllUsersNetwork from '~/components/AllUsersNetwork.vue';
import { useUserProfile } from '~/composables/useUserProfile';
import { useTrainingProgress } from '~/composables/useTrainingProgress';
import PageLoader from '~/components/common/PageLoader.vue'

definePageMeta({
  title: 'Your Spark'
})

const { userProfile } = useUserProfile();

type ViewMode = 'chart' | 'report' | 'chat' | 'share';
const viewMode = ref<ViewMode>('chart');
const isFullscreen = ref(false);

// Resolve the user's Spark ID to scope progress/eligibility
type SparkRecord = { id: string; userId?: string | null };
const { data: allSparksResp, pending: isFetchingSparks } = useFetch<{ data: SparkRecord[] }>(() => '/api/spark', { server: false });
const userSparkId = computed<string | undefined>(() => {
  const uid = userProfile.value?.id;
  const list = allSparksResp.value?.data || [];
  if (!uid) return undefined;
  return list.find(s => s.userId === uid)?.id || undefined;
});

// Progress scoped to the user's Spark
const { progressPercent, isEligible, uniqueMethodsCount, uniqueCompetenciesCount, loading: isLoadingProgress } = useTrainingProgress(userSparkId)

const isPageLoading = computed(() => isFetchingSparks.value || isLoadingProgress.value)

</script>

<style scoped>
/* Add any specific styles for the mental model page here */
</style> 