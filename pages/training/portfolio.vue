<template>
  <div class="p-8">
    <section class="border-b-4 border-primary-500 pb-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-3xl font-bold">Portfolio</h1>
        <button @click="openAddModal" class="btn-primary">
          Add Item
        </button>
      </div>
    </section>

    <!-- Grid of portfolio items -->
    <div v-if="!portfolioItems || portfolioItems.length === 0" class="text-center py-12 text-secondary-500">
      <p class="text-lg font-medium">No portfolio items yet</p>
      <p class="text-sm">Click the '+' button to add your first one.</p>
    </div>
    
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch">
      <div
        v-for="item in portfolioItems"
        :key="item.id"
        class="group relative aspect-square w-full rounded-lg bg-secondary-100 dark:bg-secondary-800 overflow-hidden portfolio-tile"
        style="aspect-ratio: 1 / 1;"
      >
        <!-- Remove button (visible on hover) -->
        <button
          @click="deleteItem(item.id)"
          :disabled="deletingItemId === item.id"
          class="absolute top-2 right-2 w-6 h-6 rounded-full bg-secondary-500 dark:bg-secondary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          :aria-label="deletingItemId === item.id ? 'Deleting...' : 'Delete item'"
          :title="deletingItemId === item.id ? 'Deleting...' : 'Delete item'"
        >
          <span v-if="deletingItemId === item.id" class="loading-spinner w-4 h-4" />
          <span v-else class="x-mask-primary w-4 h-4" aria-hidden="true"></span>
        </button>

        <!-- Media preview -->
        <template v-if="item.filePath">
          <div class="tile-media absolute inset-0 w-full h-full">
            <img 
              :src="item.filePath" 
              :alt="item.description"
              class="w-full h-full object-cover"
            />
          </div>
        </template>
        
        <!-- Link preview -->
        <template v-else-if="item.link">
          <div class="tile-media absolute inset-0 w-full h-full">
            <!-- Try to show preview image first -->
            <img 
              v-if="getLinkPreview(item.link)"
              :src="getLinkPreview(item.link)" 
              :alt="item.description"
              class="w-full h-full object-cover"
              @error="handleImageError"
            />
            <!-- Fallback to iframe for supported sites -->
            <iframe 
              v-else-if="isIframeSupported(item.link)"
              :src="getIframeUrl(item.link)"
              class="w-full h-full border-0"
              frameborder="0"
              allowfullscreen
              loading="lazy"
            ></iframe>
            <!-- Final fallback to text -->
            <div v-else class="w-full h-full flex items-center justify-center">
              <div class="text-center text-secondary-500 text-sm">
                Link
              </div>
            </div>
          </div>
        </template>
        
        <!-- Fallback -->
        <div v-else class="tile-media absolute inset-0 w-full h-full flex items-center justify-center">
          <div class="text-center text-secondary-500 text-sm">
            Item
          </div>
        </div>

        <!-- Always-visible name bar -->
        <div class="absolute bottom-0 left-0 right-0 p-3 text-sm font-medium z-20 bg-primary-500" :style="{ color: secondaryColor }">
          <div class="truncate w-full text-start">{{ item.description }}</div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mt-6 bg-error-50 border border-error-200 text-error-700 dark:bg-error-900/20 dark:border-error-500/30 dark:text-error-300 px-4 py-3">
      {{ error }}
    </div>

    <!-- Add Modal -->
    <transition name="fade-transform">
      <div v-if="isAddModalOpen" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeAddModal" />
        <div class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-6">
          <h3 class="text-lg font-semibold mb-4 text-secondary-900 dark:text-white">Add portfolio item</h3>
          <form @submit.prevent="handleAddSubmit" class="space-y-4">
            <div class="flex gap-3">
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" value="link" v-model="addType" class="form-radio" />
                <span class="text-sm">Link</span>
              </label>
              <label class="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" value="file" v-model="addType" class="form-radio" />
                <span class="text-sm">File</span>
              </label>
            </div>

            <div v-if="addType === 'link'">
              <label for="add-link-url" class="form-label">Link URL</label>
              <input id="add-link-url" v-model="addForm.url" type="url" placeholder="https://example.com" class="form-input w-full mt-1" required />
            </div>

            <div v-else>
              <label for="add-file" class="form-label">File (max 10MB)</label>
              <input id="add-file" type="file" class="form-input mt-1" @change="handleAddFileChange" required />
            </div>

            <div>
              <label for="add-description" class="form-label">Description</label>
              <input id="add-description" v-model="addForm.description" type="text" class="form-input w-full mt-1" placeholder="Brief description" required />
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="btn-secondary" @click="closeAddModal">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="isSaving">
                <span v-if="isSaving" class="loading-spinner mr-2" />
                {{ isSaving ? 'Saving...' : 'Add item' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
  
</template>

<script setup lang="ts">

// Set page metadata
definePageMeta({
  title: 'Portfolio Training',
  description: 'Share your creative portfolio for AI training'
})

import { secondaryColor } from '~/composables/useDynamicColors'

interface PortfolioItem {
  id: string
  description: string
  link?: string
  filePath?: string
}

// State
const isAddModalOpen = ref(false)
const addType = ref<'link' | 'file'>('link')
const addForm = reactive<{ description: string; url: string; file: File | null }>({ description: '', url: '', file: null })
const isSaving = ref(false)
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

// Add modal controls
const openAddModal = () => { isAddModalOpen.value = true }
const closeAddModal = () => { isAddModalOpen.value = false; resetAddForm() }
const resetAddForm = () => { addType.value = 'link'; addForm.description = ''; addForm.url = ''; addForm.file = null }
const handleAddFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) addForm.file = input.files[0]
}

const handleAddSubmit = async () => {
  error.value = null
  isSaving.value = true
  try {
    if (addType.value === 'link') {
      if (!addForm.url || !addForm.description) {
        alert('Please provide a URL and description.')
        return
      }
      await $fetch('/api/portfolio', {
        method: 'POST',
        body: { link: addForm.url, description: addForm.description }
      })
    } else {
      if (!addForm.file || !addForm.description) {
        alert('Please select a file and provide a description.')
        return
      }
      const formData = new FormData()
      formData.append('file', addForm.file)
      formData.append('description', addForm.description)
      await $fetch('/api/portfolio', { method: 'POST', body: formData })
    }
    await refreshPortfolioItems()
    closeAddModal()
  } catch (err: any) {
    error.value = err?.data?.message || 'Failed to add item.'
    console.error(err)
  } finally {
    isSaving.value = false
  }
}

const deleteItem = async (itemId: string) => {
  const item = portfolioItems.value?.find(i => i.id === itemId);
  if (!item || !confirm('Are you sure you want to delete this item?')) return

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

// Link preview and iframe helper functions
const getLinkPreview = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase()
    
    // Common social media and content platforms
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop()
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    }
    if (domain.includes('vimeo.com')) {
      const videoId = urlObj.pathname.split('/').pop()
      return `https://vumbnail.com/${videoId}.jpg`
    }
    if (domain.includes('github.com')) {
      return `https://opengraph.githubassets.com/1/${urlObj.pathname}`
    }
    if (domain.includes('behance.net')) {
      // Behance doesn't have direct image API, but we can try to extract from URL
      return null
    }
    if (domain.includes('dribbble.com')) {
      return `https://dribbble.com/shots/${urlObj.pathname.split('/').pop()}/og-image`
    }
    
    // Try to get Open Graph image if available
    return null
  } catch {
    return null
  }
}

const isIframeSupported = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase()
    
    // Sites that support iframe embedding
    const iframeSupported = [
      'youtube.com',
      'youtu.be',
      'vimeo.com',
      'spotify.com',
      'soundcloud.com',
      'codepen.io',
      'jsfiddle.net',
      'codesandbox.io'
    ]
    
    return iframeSupported.some(supported => domain.includes(supported))
  } catch {
    return false
  }
}

const getIframeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.toLowerCase()
    
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop()
      return `https://www.youtube.com/embed/${videoId}`
    }
    if (domain.includes('vimeo.com')) {
      const videoId = urlObj.pathname.split('/').pop()
      return `https://player.vimeo.com/video/${videoId}`
    }
    if (domain.includes('spotify.com')) {
      // Convert Spotify track/album URLs to embed format
      const path = urlObj.pathname
      if (path.includes('/track/') || path.includes('/album/')) {
        return url.replace('open.spotify.com', 'open.spotify.com/embed')
      }
    }
    if (domain.includes('codepen.io')) {
      return url.replace('/pen/', '/embed/')
    }
    if (domain.includes('jsfiddle.net')) {
      return url.replace('/jsfiddle/', '/embed/')
    }
    
    return url
  } catch {
    return url
  }
}

const handleImageError = (event: Event) => {
  // Hide the image if it fails to load
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<style scoped>
.form-label {
  @apply block text-sm font-medium text-secondary-700 dark:text-secondary-300;
}
.loading-spinner-small {
  @apply w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin;
}

.loading-spinner {
  @apply w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin;
}
 

/* X mask (primary) - may be used elsewhere */
.x-mask {
  background-color: hsl(var(--color-primary-500));
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}

.x-mask-primary {
  background-color: hsl(var(--color-primary-500));
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}

/* Add-tile hover */
.hover-primary-bg:hover {
  background-color: hsl(var(--color-primary-500));
  color: var(--header-nav-active-color);
}

/* Secondary-colored X mask for delete */
.x-mask-secondary {
  background-color: var(--header-nav-active-color);
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}

/* Tile behavior - ensure always square */
.portfolio-tile { 
  position: relative; 
  aspect-ratio: 1 / 1; 
  width: 100%;
  height: 0;
  padding-bottom: 100%; /* Ensures square aspect ratio */
}
.portfolio-tile .tile-media { 
  position: absolute; 
  z-index: 0; 
  transition: opacity 150ms ease-out; 
  width: 100%; 
  height: 100%; 
  top: 0;
  left: 0;
}
.portfolio-tile:hover { background-color: hsl(var(--color-primary-500)); }
.portfolio-tile:hover .tile-media { opacity: 0; pointer-events: none; }
.tile-title { opacity: 0; pointer-events: none; }
.portfolio-tile:hover .tile-title { opacity: 1; color: var(--header-nav-active-color); }

/* Add tile styling is now in ItemGrid */
</style>