<template>
  <div class="h-full flex flex-col overflow-hidden bg-white dark:bg-secondary-900">
    <!-- Header section constrained to container -->
    <div class="flex-shrink-0">
      <div class="container-wide">
        <div class="flex items-center justify-end">
          <!-- Switcher + Expand -->
          <!-- <div class="flex items-center space-x-3">
            <div class="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              <button
                v-for="tab in viewTabs"
                :key="tab.id"
                @click="viewMode = tab.id"
                :class="[
                  'px-3 py-1 text-sm font-medium transition-all duration-200 rounded-md capitalize',
                  viewMode === tab.id
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white',
                ]"
              >
                {{ tab.label }}
              </button>
            </div>

            <button @click="isFullscreen = true" class="px-3 py-1 text-sm font-medium rounded-md border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-800">
              Expand
            </button>
          </div> -->
        </div>
      </div>
    </div>
    
    <!-- Graph section full width -->
    <div class="flex-grow relative min-h-0 overflow-hidden w-full">
      <div v-if="userProfile?.id" class="absolute inset-0">
        <UserPatternGraph v-if="viewMode === 'user'" :userId="userProfile.id" />
        <AllUsersNetwork v-else />
      </div>
      <p v-else class="text-secondary-600 dark:text-secondary-400 flex items-center justify-center h-full">Loading user profile to display mental model...</p>
    </div>

    <!-- Fullscreen overlay -->
    <div v-if="isFullscreen" class="fixed inset-0 z-50 bg-white dark:bg-secondary-900">
      <div class="absolute top-4 right-4 flex items-center space-x-3">
        <div class="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            v-for="tab in viewTabs"
            :key="tab.id"
            @click="viewMode = tab.id"
            :class="[
              'px-3 py-1 text-sm font-medium transition-all duration-200 rounded-md capitalize',
              viewMode === tab.id
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white',
            ]"
          >
            {{ tab.label }}
          </button>
        </div>
        <button @click="isFullscreen = false" class="px-3 py-1 text-sm font-medium rounded-md border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-800">
          Close
        </button>
      </div>
      <div class="absolute inset-0">
        <UserPatternGraph v-if="userProfile?.id && viewMode === 'user'" :userId="userProfile.id" />
        <AllUsersNetwork v-else />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta, useRoute, useRouter } from '#imports';
import { ref, watch, onMounted } from 'vue';
import UserPatternGraph from '~/components/UserPatternGraph.vue';
import AllUsersNetwork from '~/components/AllUsersNetwork.vue';
import { useUserProfile } from '~/composables/useUserProfile';

definePageMeta({
  title: 'Your Spark'
})

const { userProfile } = useUserProfile();
const route = useRoute()
const router = useRouter()

type ViewMode = 'user' | 'all';
const viewTabs = [
  { id: 'user', label: 'You' },
  { id: 'all', label: 'All Sources' },
] as const;
const viewMode = ref<ViewMode>('user');
const isFullscreen = ref(false);

function syncFromQuery() {
  const q = (route.query.view as string) || 'user'
  viewMode.value = q === 'all' ? 'all' : 'user'
}

function setViewMode(mode: ViewMode) {
  if (viewMode.value !== mode) {
    viewMode.value = mode
  }
  router.replace({ query: { ...route.query, view: mode } })
}

watch(() => route.query.view, () => syncFromQuery())
onMounted(() => syncFromQuery())
</script>

<style scoped>
/* Add any specific styles for the mental model page here */
</style> 