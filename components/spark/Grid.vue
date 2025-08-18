<template>
  <div class="grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch">
    <!-- Tile grid region -->
    <div :class="['min-h-0', activeSpark ? 'xl:col-span-2' : 'xl:col-span-5']">
      <div v-if="sparks.length === 0" class="text-center py-12 text-gray-500">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
        <p class="text-lg font-medium">No sparks found</p>
        <p class="text-sm">Create some sparks to get started</p>
      </div>
      
      <div :class="tileGridClass">
        <div
          v-for="spark in sparks"
          :key="spark.id"
          class="group relative aspect-square w-full rounded-lg bg-secondary-100 dark:bg-secondary-800 overflow-hidden portfolio-tile cursor-pointer"
          @click="openSparkChat(spark)"
        >
          <!-- Optional Remove button (top-left) -->
          <button
            v-if="showRemove"
            class="absolute top-2 left-2 inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800 transition z-30"
            aria-label="Remove spark"
            @click.stop="emit('remove', spark.id)"
          >
            <span class="x-mask-secondary w-5 h-5" aria-hidden="true"></span>
          </button>
          <!-- Media preview (SVG dendrogram) -->
          <template v-if="spark.dendrograms && spark.dendrograms.length > 0">
            <div
              class="tile-media absolute inset-0 w-full h-full"
            >
              <div class="svg-container" v-html="spark.dendrograms[0].dendrogramSvg"></div>
            </div>
          </template>
          
          <!-- Fallback cover -->
          <div v-else class="tile-media absolute inset-0 w-full h-full flex items-center justify-center">
            <div class="text-center text-secondary-500 text-sm">
              No dendrogram
            </div>
          </div>

          <!-- Always-visible name bar -->
          <div class="absolute bottom-0 left-0 right-0 p-3 text-sm font-medium z-20 bg-primary-500" :style="{ color: secondaryColor }">
            <div class="truncate w-full text-start">{{ spark.name }}</div>
          </div>


        </div>
      </div>
    </div>

    <!-- In-page sidebar: spans 3 columns on xl, stacks on smaller screens -->
    <transition name="slide-left">
      <div v-if="activeSpark" class="min-h-[420px] xl:col-span-3 bg-white dark:bg-secondary-900 border-l-4 border-l-primary-500 rounded-lg shadow-sm grid grid-rows-[auto_1fr] max-h-[80vh] xl:max-h-[calc(100vh-var(--app-header-height)-1rem)] xl:sticky xl:top-4">
        <!-- Header -->
        <div class="flex items-center justify-between ps-8 py-4">
          <div class="min-w-0 flex-1">
            <div class="font-semibold text-3xl truncate">{{ activeSpark?.name }}</div>
          </div>
          <!-- Tabs -->
          <div class="flex gap-2 mr-4">
            <button
              class="px-3 py-1.5 rounded-md text-sm"
              :class="activeTab === 'dendrogram' ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200'"
              @click="activeTab = 'dendrogram'"
            >
              Dendrogram
            </button>
            <button
              class="px-3 py-1.5 rounded-md text-sm"
              :class="activeTab === 'chat' ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200'"
              @click="activeTab = 'chat'"
            >
              Chat
            </button>
          </div>
          <button class="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800" @click="closeSparkChat" aria-label="Close">
            <span class="x-mask-secondary w-5 h-5" aria-hidden="true"></span>
          </button>
        </div>
        <!-- Content area -->
        <div class="min-h-0 ps-8 pt-8 pb-4">
          <div v-if="activeTab === 'chat'" class="h-full">
            <Chat :key="activeSpark?.id" :embedded="true" :spark-id="activeSpark?.id" />
          </div>
          <div v-else class="h-full overflow-hidden p-3 relative">
            <div v-if="patternsPending" class="h-full flex items-center justify-center text-secondary-500">Loading...</div>
            <div v-else-if="patternsError" class="h-full flex items-center justify-center text-red-500">Failed to load dendrogram</div>
            <div v-else-if="sparkHierarchy" class="w-full h-full">
              <CircularDendrogram :hierarchy-data="sparkHierarchy" @node-click="handleNodeClick" />
            </div>
            <div v-else class="h-full flex items-center justify-center text-secondary-500">
              <div class="text-center">
                <div>No dendrogram data</div>
                <div v-if="activeSpark?.dendrograms?.length > 0 && sparkPatterns.length === 0" class="text-xs text-orange-500 mt-2">
                  This spark has dendrograms but no patterns. Patterns are needed to build the hierarchy.
                </div>
              </div>
            </div>
            
            <!-- Node Info Display -->
            <div v-if="displayNodeInfo" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-secondary-900 p-4 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 max-w-sm z-50">
              <h3 class="font-bold text-secondary-900 dark:text-white mb-2">
                {{ displayNodeInfo.type === 'ai_spark' ? 'AI Spark' : 
                   displayNodeInfo.type === 'spark' ? 'Spark' : 
                   displayNodeInfo.label }}
              </h3>
              <p v-if="displayNodeInfo.content" class="text-sm text-secondary-700 dark:text-secondary-300 italic mb-2">"{{ displayNodeInfo.content }}"</p>
              <p class="text-sm text-secondary-700 dark:text-secondary-300">Type: {{ displayNodeInfo.type === 'ai_spark' ? 'AI Spark' : displayNodeInfo.type }}</p>
              <p v-if="displayNodeInfo.predefinedMethod !== undefined" class="text-sm text-secondary-700 dark:text-secondary-300">Method Predefined: {{ displayNodeInfo.predefinedMethod ? 'Yes' : 'No' }}</p>
              <p v-if="displayNodeInfo.predefinedCompetency !== undefined" class="text-sm text-secondary-700 dark:text-secondary-300">Competency Predefined: {{ displayNodeInfo.predefinedCompetency ? 'Yes' : 'No' }}</p>
              <button @click="displayNodeInfo = null" class="mt-4 px-3 py-1.5 text-sm bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-700 transition">Close</button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import * as d3 from 'd3'
import { secondaryColor } from '~/composables/useDynamicColors'
import Chat from '~/components/Chat.vue'
import CircularDendrogram from '~/components/graphs/CircularDendrogram.vue'
import type { HierarchyNode, DisplayNodeInfo } from '~/components/graphs/types'

interface SparkDendrogram {
  id: string
  dendrogramSvg: string
  dendrogramPng?: string
  updatedAt: string
}

interface Spark {
  id: string
  name: string
  description: string
  discipline: string
  dendrograms: SparkDendrogram[]
  systemPrompt?: string
}

interface Props {
  sparks: Spark[]
  showRemove?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  chat: [spark: Spark]
  remove: [id: string]
}>()

const svgToDataUrl = (svg: string | null | undefined) => {
  try {
    if (!svg) return ''
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  } catch {
    return ''
  }
}

const activeSpark = ref<Spark | null>(null)
const activeTab = ref<'dendrogram' | 'chat'>('chat')
const displayNodeInfo = ref<DisplayNodeInfo | null>(null)
function openSparkChat(spark: Spark) {
  activeSpark.value = spark
  activeTab.value = 'chat'
  refreshPatterns()
}

function closeSparkChat() {
  activeSpark.value = null
  activeTab.value = 'chat'
}

const handleNodeClick = (nodeInfo: DisplayNodeInfo | null) => {
  displayNodeInfo.value = nodeInfo;
};

// Fetch all patterns (requires auth); we'll filter by active spark id
const { data: allPatterns, pending: patternsPending, error: patternsError, refresh: refreshPatterns } = useFetch<{ data: any[] }>(
  '/api/patterns/all',
  { immediate: false }
)

// When switching sparks, refetch to ensure freshness
watch(activeSpark, (s) => {
  if (s) {
    refreshPatterns()
  }
})

// Watch for patterns data changes to ensure hierarchy updates
watch(allPatterns, (newPatterns) => {
  if (newPatterns && activeSpark.value) {
    // Patterns data changed, hierarchy will update automatically
  }
}, { deep: true })

// Watch for tab changes
watch(activeTab, (newTab) => {
  // Tab changed, update display accordingly
})

// Fetch patterns when component mounts
onMounted(() => {
  refreshPatterns()
})

const sparkPatterns = computed(() => {
  if (!activeSpark.value) return [] as any[]
  const list = allPatterns.value?.data ?? []
  
  const filtered = list.filter((p: any) => p.sparkId === activeSpark.value?.id)
  
  return filtered
})

const sparkHierarchy = computed(() => {
  if (!activeSpark.value) return null as any
  const patterns = sparkPatterns.value

  const root: HierarchyNode = {
    name: activeSpark.value.name,
    type: 'ai_spark',
    children: []
  }

  if (!patterns || patterns.length === 0) {
    return d3.hierarchy(root)
  }

  const methodMap = new Map<string, HierarchyNode>()
  const directChildren: HierarchyNode[] = []

  patterns.forEach((p: any) => {
    // Handle patterns without method - add them directly to root
    if (!p.method || p.method.trim() === '') {
      if (p.spark) {
        const sparkNode: HierarchyNode = {
          name: `ID_${String(p.id).padStart(3, '0')}`,
          type: 'spark',
          content: p.spark,
          predefined: p.isPredefined ?? false
        }
        directChildren.push(sparkNode)
      }
      return
    }

    let methodNode = methodMap.get(p.method)
    if (!methodNode) {
      methodNode = {
        name: p.method,
        type: 'method',
        predefined: p.isPredefinedMethod ?? false,
        predefinedMethod: p.isPredefinedMethod ?? false,
        children: []
      }
      methodMap.set(p.method, methodNode)
      root.children!.push(methodNode)
    }

    // Handle patterns without competency - add them directly to method
    if (!p.competency || p.competency.trim() === '') {
      if (p.spark) {
        const sparkNode: HierarchyNode = {
          name: `ID_${String(p.id).padStart(3, '0')}`,
          type: 'spark',
          content: p.spark,
          predefined: p.isPredefined ?? false
        }
        if (!methodNode.children) methodNode.children = []
        methodNode.children.push(sparkNode)
      }
      return
    }

    let competencyNode: HierarchyNode | undefined
    competencyNode = (methodNode.children as HierarchyNode[]).find(c => c.name === p.competency)
    if (!competencyNode) {
      competencyNode = {
        name: p.competency,
        type: 'competency',
        predefined: p.isPredefinedCompetency ?? false,
        predefinedCompetency: p.isPredefinedCompetency ?? false,
        children: []
      }
      if (!methodNode.children) methodNode.children = []
      methodNode.children.push(competencyNode)
    }

    if (p.spark) {
      const sparkNode: HierarchyNode = {
        name: `ID_${String(p.id).padStart(3, '0')}`,
        type: 'spark',
        content: p.spark,
        predefined: p.isPredefined ?? false
      }
      if (!competencyNode.children) competencyNode.children = []
      competencyNode.children.push(sparkNode)
    }
  })

  // Add direct children (patterns without method) to root
  if (directChildren.length > 0) {
    root.children!.push(...directChildren)
  }

  const d3Hierarchy = d3.hierarchy(root)
  
  return d3Hierarchy
})

// Responsive tile grid class (2 columns when sidebar open, else 5 on xl)
const tileGridClass = computed(() => {
  const base = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'
  if (activeSpark.value) {
    // Keep the tile grid itself at 2 columns on xl for denser layout when sidebar is open
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4'
  }
  return base
})
</script>

<style scoped>
.portfolio-tile { position: relative; }
.portfolio-tile { position: relative; aspect-ratio: 1 / 1; }
.portfolio-tile .tile-media { position: absolute; z-index: 0; transition: opacity 150ms ease-out; width: 100%; height: 100%; }
.portfolio-tile:hover { background-color: hsl(var(--color-primary-500)); }
/* Keep dendrogram visible on hover */
.portfolio-tile:hover .tile-media { opacity: 1; pointer-events: auto; }
.tile-title { opacity: 0; pointer-events: none; }
.portfolio-tile:hover .tile-title { opacity: 1; color: var(--header-nav-active-color); }
.x-mask-secondary {
  background-color: var(--header-nav-active-color);
  -webkit-mask: url('/svg/x.svg') center / contain no-repeat;
  mask: url('/svg/x.svg') center / contain no-repeat;
}

/* Slide-in animation for the right panel */
.slide-left-enter-active, .slide-left-leave-active {
  transition: transform 200ms ease, opacity 200ms ease;
}
.slide-left-enter-from, .slide-left-leave-to { transform: translateX(100%); opacity: 0; }
.slide-left-enter-to, .slide-left-leave-from { transform: translateX(0); opacity: 1; }

/* Ensure inline SVGs (if used) maintain aspect ratio */
.portfolio-tile .tile-media svg {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain;
  display: block;
}

/* Ensure injected SVG paths use the secondary color for fill and stroke */
.svg-container :deep(svg) {
  width: 100% !important;
  height: 100% !important;
}
/* Use CSS variables for dynamic secondary color so it works in scoped styles */
:root { --spark-secondary: #888; }
.svg-container { --spark-secondary: v-bind(secondaryColor); }
.svg-container :deep(svg [fill]) { fill: var(--spark-secondary) !important; }
.svg-container :deep(svg [stroke]) { stroke: var(--spark-secondary) !important; }
/* Override class-based styles defined inside the injected SVG */
.svg-container :deep(svg .link) { stroke: var(--spark-secondary) !important; }
.svg-container :deep(svg .spark-node),
.svg-container :deep(svg .method-node),
.svg-container :deep(svg .competency-node) {
  fill: var(--spark-secondary) !important;
  stroke: var(--spark-secondary) !important;
}
.svg-container :deep(svg .node) {
  fill: var(--spark-secondary) !important;
  stroke: var(--spark-secondary) !important;
}

/* On hover, tile background turns primary, dendrogram remains visible due to tile-media opacity=1 above */

/* Ensure proper height constraints for chat tab */
.flex-1.min-h-0 {
  height: 100%;
}
</style>