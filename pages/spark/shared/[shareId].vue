<template>
  <div class="h-full p-8">
    <div v-if="pending" class="text-center py-12">
      <div class="loading-spinner w-8 h-8 mx-auto mb-4"></div>
      <p>Loading shared spark...</p>
    </div>
    
    <div v-else-if="error" class="text-center py-12 text-red-500">
      <p>{{ error.message }}</p>
    </div>
    
    <div v-else-if="spark" class="space-y-6">
      <!-- Spark Info Header -->
      <div class="text-center border-b-4 border-primary-500 pb-4">
        <h1 class="text-3xl font-bold mb-2">{{ spark.name }}</h1>
        <p class="text-secondary-600 dark:text-secondary-400 mb-2">{{ spark.description }}</p>
        <p class=" text-sm  text-secondary-500">{{ spark.discipline }}</p>
      </div>

      <!-- Limited Chat Interface -->
      <div class="max-w-4xl mx-auto">
        <div class="bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 shadow-sm">
          <!-- Messages -->
          <div class="p-6 border-b border-secondary-200 dark:border-secondary-700">
            <div v-if="messages.length === 0" class="text-center text-secondary-500 py-8">
              <p>Start a conversation with this shared spark</p>
            </div>
            
            <div v-else class="space-y-4">
              <div
                v-for="(message, index) in messages"
                :key="index"
                :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']"
              >
                <div
                  v-if="message.role === 'assistant'"
                  class="flex-shrink-0 w-10 h-10 flex items-center justify-center mr-3 overflow-hidden"
                >
                  <div class="x-mask w-10 h-10" aria-hidden="true"></div>
                </div>

                <div
                  :class="[
                    'rounded-lg max-w-lg px-4 py-2',
                    message.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-900 dark:text-white',
                  ]"
                >
                  <div class="whitespace-pre-wrap">{{ message.content }}</div>
                </div>
              </div>
            </div>

            <!-- Message Limit Warning -->
            <div v-if="messages.length >= 3" class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p class=" text-sm  text-yellow-800 dark:text-yellow-200 text-center">
                Message limit reached. <NuxtLink to="/login" class="underline">Sign in</NuxtLink> to continue the conversation.
              </p>
            </div>
          </div>

          <!-- Input Area -->
          <div class="p-6">
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <textarea
                v-model="inputMessage"
                placeholder="Type your message..."
                class="w-full p-4 border rounded-lg border-secondary-300 dark:border-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none min-h-[120px] text-base"
                :disabled="messages.length >= 3 || isLoading"
                rows="4"
              />
              
              <div class="flex justify-between items-center">
                <p class=" text-sm  text-secondary-500">
                  {{ messages.length }}/3 messages
                </p>
                
                <button
                  type="submit"
                  :disabled="!inputMessage.trim() || messages.length >= 3 || isLoading"
                  class="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span v-if="isLoading" class="loading-spinner w-4 h-4"></span>
                  {{ isLoading ? 'Sending...' : 'Send' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from '#imports'

definePageMeta({
  title: 'Shared Spark',
  layout: 'public'
})

const route = useRoute()
const shareId = route.params.shareId as string

// State
const spark = ref<any>(null)
const messages = ref<Array<{ role: 'user' | 'assistant', content: string }>>([])
const inputMessage = ref('')
const isLoading = ref(false)
const pending = ref(true)
const error = ref<{ message: string } | null>(null)

// Fetch the shared spark
const { data: sparkData, error: fetchError } = await useFetch(`/api/spark/shared/${shareId}`)

if (sparkData.value?.data) {
  spark.value = sparkData.value.data
  pending.value = false
} else if (fetchError.value) {
  error.value = { message: `Error loading spark: ${fetchError.value.message || 'Unknown error'}` }
  pending.value = false
} else {
  error.value = { message: 'Spark not found or not publicly shared' }
  pending.value = false
}

// Handle message submission
async function handleSubmit() {
  if (!inputMessage.value.trim() || messages.length >= 3 || isLoading.value) return
  
  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''
  
  // Add user message
  messages.value.push({ role: 'user', content: userMessage })
  
  isLoading.value = true
  
  try {
    // Send message to the spark
    const response = await $fetch('/api/spark/chat', {
      method: 'POST',
      body: {
        sparkId: spark.value.id,
        message: userMessage,
        isPublic: true
      }
    })
    
    // Add assistant response
    if (response.data?.content) {
      messages.value.push({ 
        role: 'assistant', 
        content: response.data.content 
      })
    }
  } catch (e: any) {
    messages.value.push({ 
      role: 'assistant', 
      content: 'Sorry, I encountered an error. Please try again.' 
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.x-mask {
  background-color: hsl(var(--color-primary-500));
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}
</style>
