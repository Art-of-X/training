<template>
  <div class="py-8 container-wide">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-secondary-900 dark:text-white mb-2">Portfolio Training</h1>
      <p class="text-lg text-secondary-600 dark:text-secondary-300">
        Share your creative work through links and file uploads to help train the AI on your artistic style and portfolio.
      </p>
    </div>

    <!-- Existing Items -->
    <div v-if="portfolioItems && portfolioItems.length > 0" class="card dark:bg-secondary-800 dark:border-secondary-700 mb-8">
      <div class="card-header dark:border-secondary-700">
        <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">Your Portfolio</h2>
      </div>
      <div class="card-body">
        <ul class="space-y-3">
          <li v-for="item in portfolioItems" :key="item.id" class="flex items-center justify-between p-3 bg-secondary-100 dark:bg-secondary-700/50 rounded-md">
            <div>
              <p class="font-medium text-secondary-800 dark:text-secondary-200">{{ item.description }}</p>
              <a v-if="item.link" :href="item.link" target="_blank" class="text-sm text-primary-600 dark:text-primary-400 hover:underline break-all">{{ item.link }}</a>
              <p v-if="item.filePath" class="text-sm text-secondary-600 dark:text-secondary-400">{{ getFileName(item.filePath) }}</p>
            </div>
            <button
              @click="deleteItem(item)"
              :disabled="deletingItemId === item.id"
              class="p-2 text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/50 rounded-full transition-colors"
              aria-label="Delete item"
            >
              <span v-if="deletingItemId === item.id" class="loading-spinner-small"></span>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Add Link section -->
      <div class="card dark:bg-secondary-800 dark:border-secondary-700">
        <div class="card-header dark:border-secondary-700">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">Add Portfolio Link</h2>
        </div>
        <div class="card-body">
          <form @submit.prevent="handleAddLink" class="space-y-4">
            <div>
              <label for="link-url" class="form-label">Link URL</label>
              <input v-model="newLink.url" id="link-url" type="url" required class="form-input w-full mt-1" placeholder="https://example.com">
            </div>
            <div>
              <label for="link-description" class="form-label">Description</label>
              <input v-model="newLink.description" id="link-description" type="text" required class="form-input w-full mt-1" placeholder="e.g., My personal portfolio website">
            </div>
            <button type="submit" :disabled="isAddingLink" class="btn-primary w-full">
              <span v-if="isAddingLink" class="loading-spinner mr-2"></span>
              {{ isAddingLink ? 'Adding...' : 'Add Link' }}
            </button>
          </form>
        </div>
      </div>

      <!-- PDF Upload section -->
      <div class="card dark:bg-secondary-800 dark:border-secondary-700">
        <div class="card-header dark:border-secondary-700">
          <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">Upload File</h2>
        </div>
        <div class="card-body">
          <form @submit.prevent="handleFileUpload" class="space-y-4">
             <div>
              <label for="file-description" class="form-label">Description</label>
              <input v-model="newFile.description" id="file-description" type="text" required class="form-input w-full mt-1" placeholder="e.g., My latest design case study">
            </div>
            <div>
              <label for="file-upload" class="form-label">File (max 10MB)</label>
              <input id="file-upload" type="file" @change="handleFileChange" required class="form-input mt-1">
            </div>
            <button type="submit" class="btn-primary w-full" :disabled="!newFile.file || !newFile.description || isUploadingFile">
              <span v-if="isUploadingFile" class="loading-spinner mr-2"></span>
              {{ isUploadingFile ? 'Uploading...' : 'Upload File' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Error display -->
    <div v-if="error" class="mt-8 bg-error-50 border border-error-200 text-error-700 dark:bg-error-900/20 dark:border-error-500/30 dark:text-error-300 px-4 py-3">
      {{ error }}
    </div>

    <!-- Actions -->
    <div class="mt-8 flex justify-end">
      <NuxtLink to="/training/dashboard" class="btn-secondary mt-4">
        Back to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// Set page metadata
definePageMeta({
  title: 'Portfolio Training',
  description: 'Share your creative portfolio for AI training'
})

interface PortfolioItem {
  id: string
  description: string
  link?: string
  filePath?: string
}

// State
const newLink = reactive({ url: '', description: '' })
const newFile = reactive<{ description: string; file: File | null }>({ description: '', file: null })
const isAddingLink = ref(false)
const isUploadingFile = ref(false)
const error = ref<string | null>(null)
const deletingItemId = ref<string | null>(null)
const user = useSupabaseUser()

// Fetch existing portfolio data
const { data: portfolioItems, pending: isLoadingPortfolio, refresh: refreshPortfolioItems } = useAsyncData<PortfolioItem[]>('portfolio', async () => {
  if (!user.value) {
    return []
  }
  try {
    const response = await $fetch<{ data: PortfolioItem[] }>('/api/portfolio')
    return response.data
  } catch (e) {
    error.value = 'Failed to load portfolio items.'
    return []
  }
}, {
  server: false,
  watch: [user]
})

const getFileName = (filePath: string) => {
  const parts = filePath.split('/')
  const fileName = parts.pop() || ''
  // remove the timestamp and underscore
  return fileName.substring(fileName.indexOf('_') + 1)
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    newFile.file = target.files[0]
  }
}

const handleAddLink = async () => {
  if (!newLink.url || !newLink.description) {
    alert('Please fill in both URL and description.')
    return
  }

  isAddingLink.value = true
  error.value = null

  try {
    await $fetch('/api/portfolio', {
      method: 'POST',
      body: { link: newLink.url, description: newLink.description }
    })
    newLink.url = ''
    newLink.description = ''
    await refreshPortfolioItems() // Refresh list
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to add link.'
    console.error(err)
  } finally {
    isAddingLink.value = false
  }
}

const handleFileUpload = async () => {
  if (!newFile.file || !newFile.description) {
    alert('Please select a file and provide a description.')
    return
  }

  const formData = new FormData()
  formData.append('file', newFile.file)
  formData.append('description', newFile.description)

  isUploadingFile.value = true
  error.value = null

  try {
    await $fetch('/api/portfolio', {
      method: 'POST',
      body: formData
    })
    newFile.description = ''
    newFile.file = null
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if(fileInput) fileInput.value = ''
    await refreshPortfolioItems()
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to upload file.'
    console.error(err)
  } finally {
    isUploadingFile.value = false
  }
}

const deleteItem = async (item: PortfolioItem) => {
  if (!confirm('Are you sure you want to delete this item?')) return

  deletingItemId.value = item.id
  error.value = null
  try {
    await $fetch(`/api/portfolio/${item.id}`, {
      method: 'DELETE',
    })
    await refreshPortfolioItems()
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to delete item.'
  } finally {
    deletingItemId.value = null
  }
}
</script>

<style scoped>
.form-label {
  @apply block text-sm font-medium text-secondary-700 dark:text-secondary-300;
}
.loading-spinner-small {
  @apply w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin;
}
</style> 