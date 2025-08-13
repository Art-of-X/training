<template>
  <div v-if="sparks.length === 0" class="text-center py-12 text-gray-500">
    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
    </svg>
    <p class="text-lg font-medium">No sparks found</p>
    <p class="text-sm">Create some sparks to get started</p>
  </div>
  
  <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
    <div
      v-for="spark in sparks"
      :key="spark.id"
      class="group relative aspect-square w-full rounded-lg bg-secondary-100 dark:bg-secondary-800 overflow-hidden portfolio-tile"
    >
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

      <!-- Persistent Chat button (top-right) -->
      <button
        class="absolute top-2 right-2 inline-flex items-center justify-center h-8 px-3 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition z-30"
        aria-label="Open chat"
        @click.stop="openSparkChat(spark)"
      >
        Chat
      </button>
    </div>
  </div>

  <!-- Right-side collapsible chat panel -->
  <transition name="slide-left">
    <div v-if="activeSpark" class="fixed top-0 right-0 h-full w-full sm:w-[420px] lg:w-[520px] bg-white dark:bg-secondary-900 shadow-xl z-50 flex flex-col">
      <div class="flex items-center justify-between p-3 border-b border-secondary-200 dark:border-secondary-700">
        <div class="min-w-0">
          <div class="text-sm text-secondary-500">Spark</div>
          <div class="font-semibold truncate">{{ activeSpark?.name }}</div>
        </div>
        <button class="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800" @click="closeSparkChat" aria-label="Close chat">
          <span class="x-mask-secondary w-5 h-5" aria-hidden="true"></span>
        </button>
      </div>
      <div class="flex-1 min-h-0">
        <Chat :key="activeSpark?.id" :embedded="true" :spark-id="activeSpark?.id" />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { secondaryColor } from '~/composables/useDynamicColors'
import Chat from '~/components/Chat.vue'

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
}

const props = defineProps<Props>()

const emit = defineEmits<{
  chat: [spark: Spark]
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
function openSparkChat(spark: Spark) {
  activeSpark.value = spark
}

function closeSparkChat() {
  activeSpark.value = null
}
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
</style>
