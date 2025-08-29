<template>
  <div class="h-full flex flex-col overflow-hidden bg-white dark:bg-secondary-900">
    <div v-if="isPageLoading" class="p-8">
      <PageLoader />
    </div>
    <div v-else class="h-full flex flex-col min-h-0">
      <!-- Empty state: no sparks -->
      <div v-if="!hasSparks" class="p-8">
        <section class="border-b-4 border-primary-500 pb-4 mb-6">
          <div class="flex items-center justify-between">
            <h1 class="text-3xl font-bold">My sparks</h1>
          </div>
        </section>
        <div class="text-center py-12 text-secondary-600 dark:text-secondary-300">
          <p class="text-base mb-4">You don’t have any sparks yet.</p>
          <button class="btn-primary" @click="openCreateSparkModalFromPage">Add a spark</button>
        </div>
      </div>
      
      <!-- Sticky header with selector, progress and tabs -->
      <section v-else class="sticky top-0 z-30 px-8 pt-8 pb-4 border-b-4 border-primary-500 bg-white dark:bg-secondary-900">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <h1 class="text-3xl font-bold">
              <template v-if="!isRenaming">{{ currentSparkName || 'Select a spark' }}</template>
              <input
                v-else
                v-model="renameDraft"
                type="text"
                class="bg-transparent border-b border-secondary-300 dark:border-secondary-600 focus:outline-none focus:ring-0 focus:border-primary-500 text-3xl font-bold"
                @keyup.enter="saveRename"
                @blur="saveRename"
              />
            </h1>
            <button class="btn-secondary" @click="startRename" :disabled="!selectedSparkId || isRenaming">Edit</button>
          </div>
          <div class="flex items-center gap-6">
            <div class="text-sm font-medium text-secondary-700 dark:text-secondary-300" v-if="progressPercent < 100">
              <span :class="{ 'opacity-50': isProcessingTraining }">
                {{ displayPercent }}% {{ currentSparkName || 'spark' }} development
              </span>
              <span v-if="isProcessingTraining" class="ml-2 text-xs animate-pulse">
                (updating...)
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="px-3 py-1.5 rounded-md text-sm"
                :class="viewMode==='train' ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200'"
                @click="viewMode='train'"
              >Train</button>
              <button
                class="px-3 py-1.5 rounded-md text-sm"
                :class="viewMode==='portfolio' ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200'"
                @click="viewMode='portfolio'"
              >My Portfolio</button>
              <button
                class="px-3 py-1.5 rounded-md text-sm"
                :class="viewMode==='chart' ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200'"
                @click="viewMode='chart'"
              >My model</button>
              <button
                class="px-3 py-1.5 rounded-md text-sm"
                :class="viewMode==='settings' ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200'"
                @click="viewMode='settings'"
                :disabled="!currentSpark"
                title="Select or create a spark first"
              >Settings</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Content area -->
      <div v-if="hasSparks" class="flex-1 min-h-0">
        <div v-show="viewMode==='train'" class="h-full px-8 py-6">
          <Chat 
            :embedded="true" 
            :training-spark-id="selectedSparkId || undefined"
            key="stable-training-chat" 
            ref="trainingChatRef" 
            @training-message="handleTrainingMessage" 
          />
        </div>
        <div v-show="viewMode==='portfolio'" class="h-full px-8 py-6 overflow-hidden">
          <PortfolioSection 
            :spark-id="selectedSparkId || undefined" 
            :on-item-added="handlePortfolioItemAdded"
          />
        </div>
        <div v-show="viewMode==='settings'" class="h-full px-8 py-6 space-y-6">
          <div v-if="!currentSpark" class="text-secondary-600 dark:text-secondary-400">Loading spark…</div>
          <template v-else>
            <div class="space-y-3">
              <h2 class="text-xl font-semibold">Profile Image</h2>
              <p class="text-sm text-secondary-600 dark:text-secondary-300">Upload a profile image for your spark.</p>
              <div class="flex items-start gap-4">
                <div class="w-24 h-24 rounded-lg bg-secondary-100 dark:bg-secondary-800 overflow-hidden flex items-center justify-center">
                  <img 
                    v-if="currentSpark.profileImageUrl" 
                    :src="currentSpark.profileImageUrl" 
                    :alt="currentSpark.name" 
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="text-secondary-500 text-xs text-center">No image</div>
                </div>
                <div class="space-y-2">
                  <input
                    ref="profileImageInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleProfileImageChange"
                  />
                  <div class="flex gap-2">
                    <button 
                      type="button" 
                      class="btn-secondary" 
                      @click="$refs.profileImageInput?.click()"
                      :disabled="isUploadingProfileImage"
                    >
                      <span v-if="isUploadingProfileImage" class="loading-spinner mr-2"></span>
                      {{ isUploadingProfileImage ? 'Uploading...' : 'Upload Image' }}
                    </button>
                    <button 
                      v-if="currentSpark.profileImageUrl"
                      type="button" 
                      class="btn-secondary" 
                      @click="removeProfileImage"
                      :disabled="isUploadingProfileImage"
                    >
                      Remove
                    </button>
                  </div>
                  <p class="text-xs text-secondary-500">Max 10MB. JPEG, PNG, GIF, WebP supported.</p>
                </div>
              </div>
            </div>
            <div class="space-y-3">
              <h2 class="text-xl font-semibold">Share</h2>
              <p class="text-sm text-secondary-600 dark:text-secondary-300">Control public sharing and discoverability for this spark.</p>
              <div class="space-y-2">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" class="form-checkbox mt-1" v-model="shareForm.isPublic" :disabled="!selectedSparkId || isSavingShare" @change="saveShareSettings" />
                  <div>
                    <div class="font-medium">Make my spark public</div>
                    <div class="text-sm text-secondary-600 dark:text-secondary-300">Generates a public link for direct access to your spark.</div>
                  </div>
                </label>
                <div v-if="shareForm.isPublic" class="space-y-2">
                  <label class="form-label">Public link</label>
                  <div class="flex gap-2">
                    <input type="text" class="form-input flex-1" :value="publicShareUrl" readonly />
                    <button type="button" class="btn-secondary" @click="copyPublicLink" :disabled="!publicShareUrl">Copy</button>
                  </div>
                </div>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" class="form-checkbox mt-1" v-model="shareForm.profitSplitOptIn" :disabled="!selectedSparkId || isSavingShare" @change="saveShareSettings" />
                  <div>
                    <div class="font-medium">Share to creatives on Art of X and participate in profit split</div>
                    <div class="text-sm text-secondary-600 dark:text-secondary-300">Makes your spark discoverable in the Personas page for other users. See <NuxtLink to="/legal/terms" class="underline">terms</NuxtLink>.</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <h2 class="text-xl font-semibold">Danger zone</h2>
              <p class="text-sm text-secondary-600 dark:text-secondary-300">Permanently delete this spark and its associations.</p>
              <button class="btn-secondary" style="background-color:#fee2e2" @click="deleteSpark">Delete spark</button>
            </div>
          </template>
        </div>
        <div v-show="viewMode==='chart'" class="h-full px-0 flex flex-col">
          <div class="flex-grow relative min-h-0 overflow-hidden w-full">
            <div v-if="userProfile?.id && selectedSparkId" class="absolute inset-0">
              <SparkPatternGraph :userId="userProfile.id" :sparkId="selectedSparkId" />
            </div>
            <div v-else class="text-secondary-600 dark:text-secondary-400 flex items-center justify-center h-full">
              Debug: userId={{ userProfile?.id }}, sparkId={{ selectedSparkId }}, viewMode={{ viewMode }}
            </div>
          </div>
        </div>
      </div>

      <!-- Fullscreen overlay remains unchanged below -->
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
          <SparkPatternGraph v-if="userProfile?.id && selectedSparkId && viewMode === 'chart'" :userId="userProfile.id" :sparkId="selectedSparkId" />
          <AllUsersNetwork v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports';
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from '#imports'
import SparkPatternGraph from '~/components/SparkPatternGraph.vue';
import AllUsersNetwork from '~/components/AllUsersNetwork.vue';
import { useUserProfile } from '~/composables/useUserProfile';
import { useTrainingProgress } from '~/composables/useTrainingProgress';
import { usePipeline } from '~/composables/usePipeline';
import PageLoader from '~/components/common/PageLoader.vue'
import Chat from '~/components/Chat.vue'
import Modal from '~/components/common/Modal.vue'
import { useEventBus } from '~/composables/useEventBus';

// Minimal inline portfolio section wrapper reusing existing API
const PortfolioSection = defineComponent({
  props: { 
    sparkId: { type: String, required: false },
    onItemAdded: { type: Function, required: false }
  },
  setup(props) {
    const isAddModalOpen = ref(false)
    const addType = ref<'link' | 'file'>('link')
    const addForm = reactive<{ description: string; url: string; file: File | null }>({ description: '', url: '', file: null })
    const isSaving = ref(false)
    const error = ref<string | null>(null)
    const deletingItemId = ref<string | null>(null)
    const { data: items, pending, refresh } = useAsyncData('portfolio-by-spark', async () => {
      const q = props.sparkId ? `?sparkId=${props.sparkId}` : ''
      const r = await $fetch<{ data: any[] }>(`/api/portfolio${q}`)
      return r.data
    }, { server: false, watch: [() => props.sparkId] })

    function openAddModal() { isAddModalOpen.value = true }
    function closeAddModal() { isAddModalOpen.value = false; addType.value='link'; addForm.description=''; addForm.url=''; addForm.file=null }
    function handleAddFileChange(e: Event) {
      const input = e.target as HTMLInputElement
      if (input.files && input.files[0]) addForm.file = input.files[0]
    }
    async function handleAddSubmit() {
      error.value = null
      isSaving.value = true
      try {
        console.log('Adding portfolio item with sparkId:', props.sparkId)
        if (addType.value === 'link') {
          await $fetch('/api/portfolio', { method: 'POST', body: { link: addForm.url, description: addForm.description, sparkId: props.sparkId } })
        } else {
          const fd = new FormData()
          fd.append('file', addForm.file as File)
          fd.append('description', addForm.description)
          if (props.sparkId) fd.append('sparkId', props.sparkId)
          await $fetch('/api/portfolio', { method: 'POST', body: fd })
        }
        await refresh()
        closeAddModal()
        
        // Trigger callback for pipeline processing
        if (props.onItemAdded) {
          props.onItemAdded(props.sparkId)
        }
      } catch (e: any) {
        error.value = e?.data?.message || 'Failed to add item.'
      } finally { isSaving.value = false }
    }
    async function deleteItem(id: string) {
      if (!confirm('Delete this item?')) return
      deletingItemId.value = id
      try { await $fetch(`/api/portfolio/${id}`, { method: 'DELETE' }); await refresh() } finally { deletingItemId.value = null }
    }
    return () => h('div', { class: 'h-full flex flex-col' }, [
      h('section', { class: 'border-b-4 border-primary-500 pb-4 px-0' }, [
        h('div', { class: 'flex items-center justify-between gap-4' }, [
          h('h1', { class: 'text-3xl font-bold' }, 'My Portfolio'),
          h('button', { class: 'btn-primary', onClick: openAddModal }, 'Add Item')
        ])
      ]),
      pending.value ? h(PageLoader) : (
        (items.value && items.value.length > 0)
          ? h('div', { class: 'grid grid-cols-5 gap-4 items-stretch mt-4 overflow-auto' }, items.value.map((item: any) =>
              h('div', { key: item.id, class: 'group relative aspect-square w-full rounded-lg bg-secondary-100 dark:bg-secondary-800 overflow-hidden portfolio-tile', style: 'aspect-ratio:1/1' }, [
                h('button', { class: 'absolute top-2 right-2 w-6 h-6 rounded-full bg-secondary-500 dark:bg-secondary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed', disabled: deletingItemId.value === item.id, onClick: () => deleteItem(item.id) }, deletingItemId.value === item.id ? h('span', { class: 'loading-spinner w-4 h-4' }) : h('span', { class: 'x-mask-primary w-4 h-4', 'aria-hidden': 'true' })),
                item.filePath ? h('div', { class: 'tile-media absolute inset-0 w-full h-full' }, [ h('img', { src: item.filePath, alt: item.description, class: 'w-full h-full object-cover' }) ]) : null,
                h('div', { class: 'absolute bottom-0 left-0 right-0 p-3 text-sm font-medium z-20 bg-primary-500' }, [ h('div', { class: 'truncate w-full text-start' }, item.description) ])
              ])
            )
          )
          : h('div', { class: 'text-center py-12 text-secondary-500' }, 'No portfolio items yet')
      ),
      isAddModalOpen.value ? h(Modal, { modelValue: true, 'onUpdate:modelValue': (v: any) => v ? openAddModal() : closeAddModal() }, {
        title: () => 'Add portfolio item',
        default: () => h('form', { onSubmit: (e: Event) => { e.preventDefault(); handleAddSubmit() }, class: 'space-y-4' }, [
          h('div', { class: 'flex gap-3' }, [
            h('label', { class: 'inline-flex items-center gap-2 cursor-pointer' }, [ h('input', { type: 'radio', value: 'link', class: 'form-radio', checked: addType.value==='link', onChange: () => addType.value='link' }), h('span', { class: 'text-sm' }, 'Link') ]),
            h('label', { class: 'inline-flex items-center gap-2 cursor-pointer' }, [ h('input', { type: 'radio', value: 'file', class: 'form-radio', checked: addType.value==='file', onChange: () => addType.value='file' }), h('span', { class: 'text-sm' }, 'File') ])
          ]),
          addType.value === 'link'
            ? h('div', null, [ h('label', { for: 'add-link-url', class: 'form-label' }, 'Link URL'), h('input', { id: 'add-link-url', class: 'form-input w-full mt-1', required: true, value: addForm.url, onInput: (e: any) => addForm.url = e.target.value, placeholder: 'https://example.com' }) ])
            : h('div', null, [ h('label', { for: 'add-file', class: 'form-label' }, 'File (max 10MB)'), h('input', { id: 'add-file', type: 'file', class: 'form-input mt-1', required: true, onChange: handleAddFileChange }) ]),
          h('div', null, [ h('label', { for: 'add-description', class: 'form-label' }, 'Description'), h('input', { id: 'add-description', class: 'form-input w-full mt-1', required: true, value: addForm.description, onInput: (e: any) => addForm.description = e.target.value, placeholder: 'Brief description' }) ])
        ]),
        actions: () => [
          h('button', { type: 'button', class: 'btn-secondary', onClick: closeAddModal }, 'Cancel'),
          h('button', { type: 'submit', class: 'btn-primary', disabled: isSaving.value, onClick: handleAddSubmit }, [ isSaving.value ? h('span', { class: 'loading-spinner mr-2' }) : null, isSaving.value ? 'Saving...' : 'Add item' ])
        ]
      }) : null
    ])
  }
})

definePageMeta({
  title: 'Your Spark'
})

const { userProfile } = useUserProfile();
const { triggerPortfolioProcessing, triggerChatProcessing } = usePipeline();

// Tabs synced to route
type ViewMode = 'chart' | 'train' | 'portfolio' | 'settings';
const route = useRoute()
const router = useRouter()
const viewMode = ref<ViewMode>((route.query.tab as ViewMode) || 'train');
watch(() => route.query.tab, (t) => { if (t) viewMode.value = t as ViewMode })
watch(viewMode, (m) => { if (m !== (route.query.tab as string)) router.replace({ query: { ...route.query, tab: m } }) })

const isFullscreen = ref(false);

type SparkRecord = { id: string; userId?: string | null; name: string };
const { data: allSparksResp, pending: isFetchingSparks, refresh: refreshSparks } = useFetch<{ data: SparkRecord[] }>(() => '/api/spark', { server: false, default: () => ({ data: [] }) });
const mySparks = computed(() => (allSparksResp.value?.data || []).filter(s => s.userId === userProfile.value?.id))
const selectedSparkId = ref<string | undefined>((route.query.spark as string) || undefined)
const currentSparkName = computed(() => mySparks.value.find(s => s.id === selectedSparkId.value)?.name || '')
const currentSpark = computed(() => mySparks.value.find(s => s.id === selectedSparkId.value) || null)
watch(() => route.query.spark, (sid) => { selectedSparkId.value = sid as string | undefined })
watch(mySparks, (list) => {
  if (!selectedSparkId.value && list && list.length > 0) router.replace({ query: { ...route.query, spark: list[0].id } })
}, { immediate: true })


// Temporarily disabled to prevent chat reloads
// watch(selectedSparkId, (sid) => {
//   if (sid !== (route.query.spark as string | undefined)) {
//     router.replace({ query: { ...route.query, spark: sid } })
//   }
// })

const bus = useEventBus();

// Listen for training progress updates
onMounted(() => {
  window.addEventListener('training-progress-update', refreshTrainingProgress)
})

onUnmounted(() => {
  window.removeEventListener('training-progress-update', refreshTrainingProgress)
})

// Progress is always spark-specific since all patterns belong to sparks
const { progressPercent, isEligible, uniqueMethodsCount, uniqueCompetenciesCount, loading: isLoadingProgress, refresh: refreshProgress } = useTrainingProgress(selectedSparkId)
const displayPercent = computed(() => Math.floor(progressPercent.value))

const isPageLoading = computed(() => isFetchingSparks.value || !userProfile.value?.id)

// Training progress state
const isProcessingTraining = ref(false)
const trainingChatRef = ref()

// Rename flow
const isRenaming = ref(false)
const renameDraft = ref('')
function startRename() {
  const s = mySparks.value.find(s => s.id === selectedSparkId.value)
  if (!s) return
  renameDraft.value = s.name
  isRenaming.value = true
}
async function saveRename() {
  if (!isRenaming.value) return
  const id = selectedSparkId.value
  const name = renameDraft.value.trim()
  if (!id || !name) {
    isRenaming.value = false
    return
  }
  
  // Store original name for potential revert
  const originalName = mySparks.value.find(s => s.id === id)?.name || ''
  
  // Update local cache immediately for instant UI feedback
  const list = allSparksResp.value?.data
  if (list) {
    const idx = list.findIndex((s:any) => s.id === id)
    if (idx !== -1) {
      // Force reactivity by replacing the entire object
      list[idx] = { ...list[idx], name }
      // Trigger reactivity explicitly
      allSparksResp.value = { ...allSparksResp.value, data: [...list] }
    }
  }
  isRenaming.value = false
  
  try {
    await $fetch<{ data: { id: string; name: string } }>(`/api/spark/${id}`, { method: 'PUT', body: { name } })
    // Still inform sidebar to refresh silently
    if (process.client) window.dispatchEvent(new Event('spark-changed'))
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to rename spark')
    // Revert on error
    if (list) {
      const idx = list.findIndex((s:any) => s.id === id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], name: originalName }
        allSparksResp.value = { ...allSparksResp.value, data: [...list] }
      }
    }
  }
}

// Delete spark
async function deleteSpark() {
  const id = selectedSparkId.value
  if (!id) return
  if (!confirm('Delete this spark? This action cannot be undone.')) return
  try {
    await $fetch(`/api/spark/${id}`, { method: 'DELETE' })
    // Update local cache in-place to avoid refetch
    const list = allSparksResp.value?.data as any[] | undefined
    if (list) {
      const idx = list.findIndex((s:any) => s.id === id)
      if (idx !== -1) list.splice(idx, 1)
    }
    // Still inform sidebar to refresh silently
    if (process.client) window.dispatchEvent(new Event('spark-changed'))
    const remaining = mySparks.value
    const next = remaining[0]?.id
    selectedSparkId.value = next
    if (!next) router.replace({ query: { ...route.query, spark: undefined } })
  } catch (e:any) {
    alert(e?.data?.message || 'Failed to delete spark')
  }
}

// Share settings state
const shareForm = ref({ isPublic: false, profitSplitOptIn: false })
const isSavingShare = ref(false)
const lastSavedShareId = ref<string | null>(null)
watch(currentSpark, (s:any) => {
  shareForm.value.isPublic = Boolean(s?.isPublic)
  shareForm.value.profitSplitOptIn = Boolean(s?.profitSplitOptIn)
  // If current spark has a share id, prefer it
  if (s?.publicShareId) lastSavedShareId.value = s.publicShareId
}, { immediate: true })
const publicShareUrl = computed(() => {
  if (!shareForm.value.isPublic) return ''
  const id = (currentSpark.value as any)?.publicShareId || lastSavedShareId.value
  if (!id) return ''
  if (process.client) return `${window.location.origin}/spark/shared/${id}`
  return `/spark/shared/${id}`
})
async function saveShareSettings() {
  if (!selectedSparkId.value) return
  isSavingShare.value = true
  try {
    const updated = await $fetch<{ data: { isPublic: boolean; profitSplitOptIn: boolean; publicShareId?: string } }>(
      '/api/spark/share', { method: 'PUT', body: { sparkId: selectedSparkId.value, isPublic: shareForm.value.isPublic, profitSplitOptIn: shareForm.value.profitSplitOptIn } }
    )
    shareForm.value.isPublic = updated.data.isPublic
    shareForm.value.profitSplitOptIn = updated.data.profitSplitOptIn
    if (updated.data.publicShareId) lastSavedShareId.value = updated.data.publicShareId
    // Update local cache in-place to avoid refetch
    const list = allSparksResp.value?.data as any[] | undefined
    const id = selectedSparkId.value
    if (list && id) {
      const idx = list.findIndex((s:any) => s.id === id)
      if (idx !== -1) list[idx] = { ...list[idx], isPublic: updated.data.isPublic, profitSplitOptIn: updated.data.profitSplitOptIn, publicShareId: updated.data.publicShareId || list[idx].publicShareId }
    }
    // Still inform sidebar to refresh silently
    if (process.client) window.dispatchEvent(new Event('spark-changed'))
  } catch (e:any) {
    alert(e?.data?.message || 'Failed to update share settings')
  } finally {
    isSavingShare.value = false
  }
}
function copyPublicLink() {
  const link = publicShareUrl.value
  if (!link) return
  try { if (navigator.clipboard) navigator.clipboard.writeText(link) } catch {}
}

const hasSparks = computed(() => {
  // During SSR or initial load, always return false to match server state
  if (process.server || isFetchingSparks.value || !userProfile.value?.id) return false
  return mySparks.value && mySparks.value.length > 0
})
function openCreateSparkModalFromPage() {
  if (process.client) window.dispatchEvent(new Event('open-create-spark'))
}

// Profile image upload
const profileImageInput = ref<HTMLInputElement>()
const isUploadingProfileImage = ref(false)

async function handleProfileImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !selectedSparkId.value) return

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    alert('Only image files are allowed (JPEG, PNG, GIF, WebP)')
    return
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('File size too large. Maximum 10MB allowed.')
    return
  }

  isUploadingProfileImage.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch<{ data: any }>(`/api/spark/${selectedSparkId.value}/profile-image`, {
      method: 'PUT',
      body: formData
    })

    // Update local cache immediately
    const list = allSparksResp.value?.data
    if (list) {
      const idx = list.findIndex((s: any) => s.id === selectedSparkId.value)
      if (idx !== -1) {
        list[idx] = { ...list[idx], profileImageUrl: response.data.profileImageUrl }
        allSparksResp.value = { ...allSparksResp.value, data: [...list] }
      }
    }

    // Still inform sidebar to refresh silently
    if (process.client) window.dispatchEvent(new Event('spark-changed'))
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to upload profile image')
  } finally {
    isUploadingProfileImage.value = false
    // Clear the input
    if (input) input.value = ''
  }
}

async function removeProfileImage() {
  if (!selectedSparkId.value) return
  
  if (!confirm('Remove profile image?')) return

  try {
    const response = await $fetch<{ data: any }>(`/api/spark/${selectedSparkId.value}`, {
      method: 'PUT',
      body: { profileImageUrl: null }
    })

    // Update local cache immediately
    const list = allSparksResp.value?.data
    if (list) {
      const idx = list.findIndex((s: any) => s.id === selectedSparkId.value)
      if (idx !== -1) {
        list[idx] = { ...list[idx], profileImageUrl: null }
        allSparksResp.value = { ...allSparksResp.value, data: [...list] }
      }
    }

    // Still inform sidebar to refresh silently
    if (process.client) window.dispatchEvent(new Event('spark-changed'))
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to remove profile image')
  }
}

// Handle portfolio item additions
async function handlePortfolioItemAdded(sparkId: string) {
  if (!sparkId || !userProfile.value?.id) return
  
  try {
    await triggerPortfolioProcessing(userProfile.value.id, undefined, sparkId)
    // Refresh progress after portfolio processing
    setTimeout(() => refreshProgress(), 2000) // Small delay to allow pipeline to complete
  } catch (error) {
    // Pipeline processing failed - handled silently
  }
}

// Handle training message - trigger pipeline processing
async function handleTrainingMessage() {
  if (!selectedSparkId.value || !userProfile.value?.id) return
  
  try {
    await triggerChatProcessing(userProfile.value.id, undefined, selectedSparkId.value);
    
    // Simple delayed refresh without complex state changes
    setTimeout(() => refreshProgress(), 2000)
  } catch (error) {
    console.error('❌ Pipeline processing failed:', error);
  }
}



// Handle training progress refresh after chat messages
async function refreshTrainingProgress() {
  isProcessingTraining.value = true
  
  // Quick refresh for patterns (which process faster)
  setTimeout(async () => {
    await refreshProgress()
  }, 800)
  
  // Final refresh after embeddings complete
  setTimeout(async () => {
    await refreshProgress()
    isProcessingTraining.value = false
  }, 2000)
}
</script>

<style scoped>
/* Add any specific styles for the mental model page here */
.loading-spinner {
  @apply w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin;
}
</style> 