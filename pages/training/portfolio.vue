<template>
  <div class="p-8">
    <SectionHeader title="Portfolio" @add="openAddModal" />

    <!-- Grid of portfolio items -->
    <ItemGrid 
      :items="portfolioItems || []" 
      @delete="deleteItem"
    />
    <div v-if="!portfolioItems || portfolioItems.length === 0" class="text-center py-12 text-secondary-500">
      <p>No portfolio items yet. Click the '+' button to add your first one.</p>
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
import ItemGrid from '~/components/common/ItemGrid.vue';
import SectionHeader from '~/components/common/SectionHeader.vue';
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
</script>

<style scoped>
.form-label {
  @apply block text-sm font-medium text-secondary-700 dark:text-secondary-300;
}
.loading-spinner-small {
  @apply w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin;
}
.fade-transform-enter-active,
.fade-transform-leave-active {
  @apply transition duration-150 ease-out;
}
.fade-transform-enter-from,
.fade-transform-leave-to {
  @apply opacity-0 scale-95;
}

/* X mask (primary) - may be used elsewhere */
.x-mask {
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

/* Tile behavior */
.portfolio-tile { position: relative; }
.portfolio-tile .tile-media { position: relative; z-index: 0; transition: opacity 150ms ease-out; }
.portfolio-tile:hover { background-color: hsl(var(--color-primary-500)); }
.portfolio-tile:hover .tile-media { opacity: 0; pointer-events: none; }
.tile-title { opacity: 0; pointer-events: none; }
.portfolio-tile:hover .tile-title { opacity: 1; color: var(--header-nav-active-color); }

/* Add tile styling is now in ItemGrid */
</style>