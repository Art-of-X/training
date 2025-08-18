<template>
  <div class="user-pattern-graph w-full h-full flex flex-col p-8">
    <!-- Header section -->
    <section class="border-b-4 border-primary-500 pb-4 mb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">Your Spark</h1>
        <div class="flex gap-2 items-center">
          <button
            class="px-3 py-1.5 rounded-md text-sm transition-colors"
            :class="activeTab === 'chart' ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200'"
            @click="activeTab = 'chart'"
          >
            Chart
          </button>
          <button
            class="px-3 py-1.5 rounded-md text-sm transition-colors"
            :class="activeTab === 'chat' ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200'"
            @click="activeTab = 'chat'"
          >
            Chat
          </button>
          <button
            class="px-3 py-1.5 rounded-md text-sm transition-colors"
            :class="activeTab === 'report' ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200'"
            @click="activeTab = 'report'"
          >
            Report
          </button>
          <button
            v-if="userProfile?.id"
            class="ml-2 px-3 py-1.5 rounded-md text-sm transition-colors bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-200 dark:hover:bg-secondary-700"
            @click="isShareModalOpen = true"
          >
            Share
          </button>
        </div>
      </div>
    </section>


    <!-- Content based on active tab -->
    <div v-if="activeTab === 'chart'" class="flex-grow relative w-full min-h-0">
      <div v-if="pending" class="text-secondary-600 dark:text-secondary-400 flex-grow flex items-center justify-center">Loading patterns...</div>
      <div v-else-if="error" class="text-red-500 flex-grow flex items-center justify-center">Error loading patterns: {{ error.message }}</div>
      <div v-else-if="!filteredPatterns || filteredPatterns.length === 0" class="text-secondary-600 dark:text-secondary-400 flex-grow flex items-center justify-center">
        <template v-if="selectedMethod || selectedCompetency">
          <span>No patterns found matching the selected filters.</span>
        </template>
        <template v-else-if="userSparkDendrogramSvg">
          <div class="w-full h-full overflow-auto p-4">
            <div class="max-w-[1200px] mx-auto">
              <div class="svg-container" v-html="userSparkDendrogramSvg"></div>
            </div>
          </div>
        </template>
        <template v-else>
          <span>No patterns found for this user.</span>
        </template>
      </div>
      <div v-else class="flex flex-col h-full flex-grow" style="min-height: 0;">
        <div v-if="!isMounted" class="text-secondary-600 dark:text-secondary-400 flex-grow flex items-center justify-center">
          Loading interactive graph...
        </div>
        
        <!-- Graph Components -->
        <CircularDendrogram 
          v-if="isMounted" 
          :hierarchy-data="hierarchyData"
          @node-click="handleNodeClick"
          class="flex-grow w-full h-full"
        />

        <!-- Node Info Display -->
        <div v-if="displayNodeInfo" class="fixed pointer-events-none p-3 rounded-lg shadow-lg border max-w-sm z-50 transition-opacity duration-200" :style="{ 
          left: mouseX + 10 + 'px', 
          top: mouseY + 10 + 'px',
          backgroundColor: primaryColor,
          borderColor: primaryColor,
          color: secondaryColor
        }">
          <h3 class="font-bold mb-2">
            {{ displayNodeInfo.type === 'ai_spark' ? 'AI Spark' : 
               displayNodeInfo.type === 'spark' ? 'Spark' : 
               displayNodeInfo.label }}
          </h3>
          <p v-if="displayNodeInfo.content" class="text-sm italic mb-2">"{{ displayNodeInfo.content }}"</p>
          <p class="text-sm">Type: {{ displayNodeInfo.type === 'ai_spark' ? 'AI Spark' : displayNodeInfo.type }}</p>
          <p v-if="displayNodeInfo.predefinedMethod !== undefined" class="text-sm">Method Predefined: {{ displayNodeInfo.predefinedMethod ? 'Yes' : 'No' }}</p>
          <p v-if="displayNodeInfo.predefinedCompetency !== undefined" class="text-sm">Competency Predefined: {{ displayNodeInfo.predefinedCompetency ? 'Yes' : 'No' }}</p>
        </div>
      </div>
    </div>

    <!-- Chat tab content -->
    <div v-else-if="activeTab === 'chat'" class="flex-grow min-h-0">
      <div v-if="!userSparkId" class="text-secondary-600 dark:text-secondary-400 py-12">
        No personal spark found to chat with.
      </div>
      <div v-else class="h-full min-h-0">
        <Chat :key="userSparkId ? `spark-${userSparkId}` : 'default'" :embedded="true" :spark-id="userSparkId || undefined" />
      </div>
    </div>

    <!-- Report tab content -->
    <div v-else-if="activeTab === 'report'" class="flex-grow relative w-full min-h-0 overflow-y-auto">
      <div class="space-y-6">
        <div v-if="report.sections.length === 0" class="text-center py-12 text-secondary-500">
          No methods or competencies found yet.
        </div>

        <div v-else class="space-y-8">
          <div v-for="section in report.sections" :key="section.method" class="space-y-2">
            <h2 class="text-xl font-semibold text-secondary-900 dark:text-white">{{ section.method }}</h2>
            <p v-if="section.methodDescription" class="text-sm text-secondary-600 dark:text-secondary-300">{{ section.methodDescription }}</p>

            <div v-for="comp in section.competencies" :key="comp.name" class="mt-2">
              <div class="font-medium text-secondary-900 dark:text-white">{{ comp.name }}</div>
              <div v-if="comp.description" class="text-sm text-secondary-600 dark:text-secondary-300">{{ comp.description }}</div>
              <div v-if="comp.citations && comp.citations.length" class="text-xs text-secondary-600 dark:text-secondary-400 mt-1">
                Citations: 
                <span>
                  <span v-for="(n, idx) in comp.citations" :key="n">[{{ n }}]<span v-if="idx < comp.citations.length - 1">, </span></span>
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Citations</h3>
            <ol class="list-decimal ml-5 mt-2 space-y-1 text-sm text-secondary-700 dark:text-secondary-300">
              <li v-for="c in report.citations" :key="c.num">
                <span class="font-medium">{{ c.label }}:</span>
                <span class="italic">"{{ c.preview }}"</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
    <!-- Share Modal -->
    <transition name="fade-transform">
      <div v-if="isShareModalOpen" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="isShareModalOpen = false" />
        <div class="relative w-full max-w-lg bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-lg">
          <div class="flex items-start justify-between mb-4">
            <h3 class="text-lg font-semibold text-secondary-900 dark:text-white">Share your spark</h3>
            <button class="btn-secondary" @click="isShareModalOpen = false">Close</button>
          </div>
          <div class="space-y-4">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" class="form-checkbox mt-1" v-model="shareForm.isPublic" />
              <div>
                <div class="font-medium">Make my spark public</div>
                <div class="text-sm text-secondary-600 dark:text-secondary-300">Generates a public link for direct access to your spark.</div>
              </div>
            </label>

            <div v-if="shareForm.isPublic" class="space-y-2">
              <label class="form-label">Public link</label>
              <div class="flex gap-2">
                <input type="text" class="form-input flex-1" :value="publicShareUrl" readonly />
                <button 
                  type="button" 
                  class="btn-secondary" 
                  @click="copyToClipboard"
                  :disabled="!publicShareUrl"
                >
                  {{ copyStatus === 'copied' ? 'Copied!' : 'Copy' }}
                </button>
              </div>
              <p class="text-xs text-secondary-600 dark:text-secondary-300">
                Anyone with this link can chat with your spark (limited to 3 messages for unauthenticated users).
              </p>
            </div>

            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" class="form-checkbox mt-1" v-model="shareForm.profitSplitOptIn" />
              <div>
                <div class="font-medium">Share to creatives on Art of X and participate in profit split</div>
                <div class="text-sm text-secondary-600 dark:text-secondary-300">
                  Makes your spark discoverable in the Personas page for other users. See <NuxtLink to="/legal/terms" class="underline">terms</NuxtLink>. This is optional and off by default.
                </div>
              </div>
            </label>

            <div class="flex justify-end gap-2 pt-2">
              <button type="button" class="btn-secondary" @click="isShareModalOpen = false">Cancel</button>
              <button type="button" class="btn-primary" :disabled="isSavingShare" @click="saveShareSettings">
                <span v-if="isSavingShare" class="loading-spinner mr-2" />
                {{ isSavingShare ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watchEffect } from 'vue';
import * as d3 from 'd3';
import CircularDendrogram from './graphs/CircularDendrogram.vue';
import type { Pattern, HierarchyNode, DisplayNodeInfo } from './graphs/types';
import { useDynamicColors } from '~/composables/useDynamicColors';
import frameworkJson from '~/assets/json/mental_models.json';
import Chat from '~/components/Chat.vue';
import { useUserProfile } from '~/composables/useUserProfile';

const isMounted = ref(false);

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
  mode: {
    type: String as () => 'user' | 'all',
    default: 'user',
  },
});

const fetchUrl = computed(() => props.mode === 'all' ? '/api/patterns/all' : `/api/patterns/${props.userId}`);
const { data: fetchedPatterns, pending, error } = useFetch<{ data: Pattern[] }>(() => fetchUrl.value);
const { primaryColor, secondaryColor } = useDynamicColors();

// Filter state
const selectedMethod = ref('');
const selectedCompetency = ref('');
const graphType = ref('circular'); // Only 'circular' available currently
const activeTab = ref<'chart' | 'chat' | 'report'>('chart');

// Node info for display on hover
const displayNodeInfo = ref<DisplayNodeInfo | null>(null);
const mouseX = ref(0);
const mouseY = ref(0);

// Available filter options
const availableMethods = computed(() => {
  if (!fetchedPatterns.value || !fetchedPatterns.value.data) return [];
  return Array.from(new Set(fetchedPatterns.value.data.map(p => p.method).filter(Boolean))).sort();
});

const availableCompetencies = computed(() => {
  if (!fetchedPatterns.value || !fetchedPatterns.value.data) return [];
  return Array.from(new Set(fetchedPatterns.value.data.map(p => p.competency).filter(Boolean))).sort();
});

// Filtered patterns based on selections
const filteredPatterns = computed(() => {
  if (!fetchedPatterns.value || !fetchedPatterns.value.data) return [];
  return fetchedPatterns.value.data.filter(p => {
    const matchMethod = selectedMethod.value ? p.method === selectedMethod.value : true;
    const matchCompetency = selectedCompetency.value ? p.competency === selectedCompetency.value : true;
    return matchMethod && matchCompetency;
  });
});

// Graph data (nodes and links) derived from filtered patterns
const hierarchyData = computed(() => {
  if (!filteredPatterns.value || filteredPatterns.value.length === 0) return null;

  if (props.mode === 'all') {
    const root: HierarchyNode = { name: 'All Sources', type: 'user', children: [] };
    const sourceMap = new Map<string, HierarchyNode>();

    filteredPatterns.value.forEach(p => {
      // Determine source - either user or spark
      const sourceId = p.userId || p.sparkId || 'unknown';
      const sourceType = p.userId ? 'user' : 'ai_spark';
      const sourceName = p.userId ? 
        (p as any).sourceName || `User ${sourceId.slice(0, 8)}` : 
        (p as any).sourceName || `AI Spark ${sourceId.slice(0, 8)}`;

      let sourceNode = sourceMap.get(sourceId);
      if (!sourceNode) {
        sourceNode = { 
          name: sourceName, 
          type: sourceType, 
          children: [],
          predefined: sourceType === 'ai_spark' // AI sparks are predefined
        };
        sourceMap.set(sourceId, sourceNode);
        root.children!.push(sourceNode);
      }

      if (!p.method) return;

      let methodNode = (sourceNode.children as HierarchyNode[]).find(c => c.name === p.method);
      if (!methodNode) {
        methodNode = { 
          name: p.method, 
          type: 'method', 
          predefined: p.isPredefinedMethod || false,
          predefinedMethod: p.isPredefinedMethod || false,
          children: [] 
        };
        (sourceNode.children as HierarchyNode[]).push(methodNode);
      }

      let competencyNode: HierarchyNode | undefined;
      if (p.competency) {
        competencyNode = methodNode.children!.find(c => c.name === p.competency);
        if (!competencyNode) {
          competencyNode = { 
            name: p.competency, 
            type: 'competency', 
            predefined: p.isPredefinedCompetency || false,
            predefinedCompetency: p.isPredefinedCompetency || false,
            children: [] 
          };
          methodNode.children!.push(competencyNode);
        }
      }

      if (p.spark) {
        const sparkNode: HierarchyNode = {
          name: `ID_${String(p.id).padStart(3, '0')}`,
          type: 'spark',
          content: p.spark,
          predefined: p.isPredefined || false,
        };
        const parent = competencyNode || methodNode;
        if (!parent.children) parent.children = [];
        parent.children.push(sparkNode);
      }
    });

    if (root.children!.length === 0) return null;
    return d3.hierarchy(root);
  }

  // default: single user view - unified hierarchy
  const root: HierarchyNode = { name: 'You', type: 'user', children: [] };
  
  // Combine all patterns into a single hierarchy
  const allPatterns = filteredPatterns.value;
  const methodMap = new Map<string, HierarchyNode>();
  
  allPatterns.forEach(p => {
    if (!p.method) return;

    let methodNode = methodMap.get(p.method);
    if (!methodNode) {
      methodNode = { 
        name: p.method, 
        type: 'method', 
        predefined: p.isPredefinedMethod || false,
        predefinedMethod: p.isPredefinedMethod || false,
        children: [] 
      };
      methodMap.set(p.method, methodNode);
      root.children!.push(methodNode);
    }

    let competencyNode: HierarchyNode | undefined;
    if (p.competency) {
      competencyNode = methodNode.children!.find(c => c.name === p.competency);
      if (!competencyNode) {
        competencyNode = { 
          name: p.competency, 
          type: 'competency', 
          predefined: p.isPredefinedCompetency || false,
          predefinedCompetency: p.isPredefinedCompetency || false,
          children: [] 
        };
        methodNode.children!.push(competencyNode);
      }
    }

    if (p.spark) {
      const sparkNode: HierarchyNode = {
        name: `ID_${String(p.id).padStart(3, '0')}`,
        type: 'spark',
        content: p.spark,
        predefined: p.isPredefined || false,
      };
      const parent = competencyNode || methodNode;
      if (!parent.children) parent.children = [];
      parent.children.push(sparkNode);
    }
  });

  if (root.children!.length === 0) return null;
  return d3.hierarchy(root);
});

// User spark for Chat tab and dendrogram fallback
const { userProfile } = useUserProfile();
type SparkWithDendrogram = { 
  id: string; 
  userId?: string | null; 
  name: string; 
  dendrograms?: Array<{ id: string; dendrogramSvg: string; dendrogramPng?: ArrayBuffer | null }>
  isPublic?: boolean;
  publicShareId?: string | null;
  profitSplitOptIn?: boolean;
};
const { data: allSparksResp, refresh: refreshAllSparks } = useFetch<{ data: SparkWithDendrogram[] }>(() => '/api/spark', { server: false });
const userSpark = computed(() => {
  const uid = userProfile.value?.id;
  const list = allSparksResp.value?.data || [];
  return uid ? list.find(s => s.userId === uid) || null : null;
});
const userSparkId = computed(() => userSpark.value?.id || null);
const userSparkDendrogramSvg = computed(() => {
  const ds = userSpark.value?.dendrograms;
  return ds && ds.length > 0 ? ds[0].dendrogramSvg : null;
});

// Share UI state
const isShareModalOpen = ref(false)
const shareForm = ref({ isPublic: false, profitSplitOptIn: false })
const isSavingShare = ref(false)
const copyStatus = ref<'idle' | 'copied'>('idle')
const publicShareUrl = computed(() => {
  // If public sharing is enabled, show the link (either existing or will be generated)
  if (!shareForm.value.isPublic) return ''
  
  const s = userSpark.value as any
  const id = s?.publicShareId as string | undefined
  
  // If we have a share ID, use it; otherwise show a placeholder that will be generated
  const shareId = id || 'generating...'
  if (process.client) return `${window.location.origin}/spark/shared/${shareId}`
  return `/spark/shared/${shareId}`
})

// Copy to clipboard function
async function copyToClipboard() {
  if (!publicShareUrl.value) return
  
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Use modern clipboard API
      await navigator.clipboard.writeText(publicShareUrl.value)
      copyStatus.value = 'copied'
      setTimeout(() => { copyStatus.value = 'idle' }, 2000)
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea')
      textArea.value = publicShareUrl.value
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        copyStatus.value = 'copied'
        setTimeout(() => { copyStatus.value = 'idle' }, 2000)
      } catch (err) {
        console.error('Fallback copy failed:', err)
        alert('Copy failed. Please manually select and copy the link.')
      } finally {
        document.body.removeChild(textArea)
      }
    }
  } catch (err) {
    console.error('Copy failed:', err)
    alert('Copy failed. Please manually select and copy the link.')
  }
}

watchEffect(() => {
  const s: any = userSpark.value
  shareForm.value.isPublic = Boolean(s?.isPublic)
  shareForm.value.profitSplitOptIn = Boolean(s?.profitSplitOptIn)
})

async function saveShareSettings() {
  if (!userProfile.value?.id) return
  isSavingShare.value = true
  try {
    // If no spark exists yet, create one first
    let sparkId = userSparkId.value
    if (!sparkId) {
      // Create a minimal spark for this user
      const newSpark = await $fetch('/api/spark', {
        method: 'POST',
        body: {
          name: 'My Spark',
          description: 'Personal creative spark',
          systemPrompt: 'You are a creative assistant.',
          discipline: 'General',
          userId: userProfile.value.id,
        },
      })
      sparkId = newSpark.data.id
      // Refresh to get the new spark
      await refreshAllSparks()
    }

    // Now update sharing settings
    await $fetch('/api/spark/share', {
      method: 'PUT',
      body: {
        sparkId,
        isPublic: shareForm.value.isPublic,
        profitSplitOptIn: shareForm.value.profitSplitOptIn,
      },
    })
    await refreshAllSparks()
    isShareModalOpen.value = false
  } catch (e: any) {
    alert(e?.data?.message || 'Failed to update share settings')
  } finally {
    isSavingShare.value = false
  }
}

// Report data derived from filtered patterns and framework
type ReportSection = {
  method: string;
  methodDescription?: string;
  competencies: Array<{ name: string; description?: string; citations: number[] }>;
};
type Citation = { num: number; label: string; preview: string };

const framework: any = frameworkJson as any;
const frameworkMethodDesc = new Map<string, string>();
const frameworkCompetencyDesc = new Map<string, string>();
if (framework && framework.methods) {
  for (const m of framework.methods as Array<{ name: string; description?: string }>) {
    if (m?.name) frameworkMethodDesc.set(m.name, m.description || '');
  }
}
if (framework && framework.competencies) {
  for (const c of framework.competencies as Array<{ name: string; description?: string }>) {
    if (c?.name) frameworkCompetencyDesc.set(c.name, c.description || '');
  }
}

function createPreview(text: string, maxLen = 140): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > maxLen ? t.slice(0, maxLen - 1) + '…' : t;
}

const report = computed<{ sections: ReportSection[]; citations: Citation[] }>(() => {
  const patterns = filteredPatterns.value || [];
  if (patterns.length === 0) return { sections: [], citations: [] };

  // Build citation index for unique pattern ids with spark content
  const idToNum = new Map<string | number, number>();
  const citations: Citation[] = [];
  function getCitationNum(p: Pattern): number | null {
    if (!p || !p.spark) return null;
    const key = p.id;
    if (idToNum.has(key)) return idToNum.get(key)!;
    const num = citations.length + 1;
    idToNum.set(key, num);
    citations.push({
      num,
      label: `ID_${String(p.id).padStart(3, '0')}`,
      preview: createPreview(p.spark)
    });
    return num;
  }

  // Group by method -> competency
  const methodMap = new Map<string, ReportSection>();
  for (const p of patterns) {
    const methodName = p.method?.trim();
    if (!methodName) continue;
    let section = methodMap.get(methodName);
    if (!section) {
      section = {
        method: methodName,
        methodDescription: frameworkMethodDesc.get(methodName) || undefined,
        competencies: []
      };
      methodMap.set(methodName, section);
    }

    const compName = p.competency?.trim();
    let comp = section.competencies.find(c => c.name === compName);
    if (!comp) {
      comp = {
        name: compName || 'General',
        description: compName ? (frameworkCompetencyDesc.get(compName) || undefined) : undefined,
        citations: []
      };
      section.competencies.push(comp);
    }
    const cit = getCitationNum(p);
    if (cit && !comp.citations.includes(cit)) comp.citations.push(cit);
  }

  // Sort for stable output
  const sections = Array.from(methodMap.values())
    .sort((a, b) => a.method.localeCompare(b.method));
  sections.forEach(s => {
    s.competencies.sort((a, b) => a.name.localeCompare(b.name));
    s.competencies.forEach(c => c.citations.sort((a, b) => a - b));
  });
  citations.sort((a, b) => a.num - b.num);

  return { sections, citations };
});

const handleNodeClick = (nodeInfo: DisplayNodeInfo | null, event?: MouseEvent) => {
  displayNodeInfo.value = nodeInfo;
  if (event && nodeInfo) {
    mouseX.value = event.clientX;
    mouseY.value = event.clientY;
  }
};

onMounted(() => {
  isMounted.value = true;
});
</script>

<style scoped>
.user-pattern-graph {
  position: relative; /* Needed for absolute positioning of node info */
}

/* Override default D3 axis styles */
.x-axis path,
.y-axis path {
  stroke: transparent; /* Hide axis lines */
}

.x-axis line,
.y-axis line {
  stroke: transparent; /* Hide axis ticks */
}

.x-axis text,
.y-axis text {
  fill: transparent; /* Hide axis text */
}
</style> 