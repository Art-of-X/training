<template>
  <div>
    <h3 class="text-xl font-semibold text-secondary-900 dark:text-white mb-4">Chat History</h3>
    <div v-if="loading" class="text-center py-8 text-secondary-600 dark:text-secondary-400">Loading history...</div>
    <div v-else-if="error" class="text-center py-8 text-red-500">Error loading history: {{ error.message }}</div>
    <div v-else-if="Object.keys(groupedHistory).length === 0" class="text-center py-8 text-secondary-600 dark:text-secondary-400">No chat history found.</div>
    <div v-else>
      <div v-for="(session, date) in groupedHistory" :key="date" class="mb-4">
        <h4 class="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">{{ date }}</h4>
        <ul class="space-y-1">
          <li v-for="entry in session" :key="entry.id" class="flex justify-between items-center p-2 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer transition-colors" @click="$emit('loadSession', entry.messages, entry.id)">
            <div class="flex-1 overflow-hidden">
              <p class="text-sm text-secondary-900 dark:text-white truncate font-medium">
                {{ entry.title }}
              </p>
              <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">{{ entry.time }} ({{ entry.messageCount }} messages)</p>
            </div>
            <button @click.stop="$emit('loadSession', entry.messages, entry.id)" class="ml-4 btn-primary px-3 py-1 text-sm">Load</button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  loading: boolean,
  error: Error | null,
  groupedHistory: Record<string, any>
}>()
const emit = defineEmits(['loadSession'])
</script> 