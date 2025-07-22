<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
      <div class="flex justify-between items-center border-b pb-3 mb-4">
        <h3 class="text-xl font-semibold text-secondary-900 dark:text-white">Chat History</h3>
        <button @click="$emit('close')" class="text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <div v-if="loading" class="text-center py-8 text-secondary-600 dark:text-secondary-400">Loading history...</div>
      <div v-else-if="error" class="text-center py-8 text-red-500">Error loading history: {{ error.message }}</div>
      <div v-else-if="Object.keys(groupedHistory).length === 0" class="text-center py-8 text-secondary-600 dark:text-secondary-400">No chat history found.</div>
      <div v-else class="flex-grow overflow-y-auto space-y-4 pr-2">
        <div v-for="(session, date) in groupedHistory" :key="date" class="border rounded-lg p-3 bg-secondary-50 dark:bg-secondary-700/50">
          <h4 class="font-semibold text-secondary-800 dark:text-secondary-200 mb-2">{{ date }}</h4>
          <ul class="space-y-2">
            <li v-for="entry in session" :key="entry.id" class="flex justify-between items-center p-2 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer" @click="$emit('loadSession', entry.messages, entry.id)">
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
      <div class="flex justify-end pt-4 border-t mt-4">
        <button @click="$emit('close')" class="btn-secondary">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean,
  loading: boolean,
  error: Error | null,
  groupedHistory: Record<string, any>
}>()
const emit = defineEmits(['close', 'loadSession'])
</script> 