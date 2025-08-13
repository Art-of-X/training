<template>
  <div class="user-pattern-graph w-full h-full flex flex-col">


    <!-- Graph section full width -->
    <div class="flex-grow relative w-full min-h-0">
      <div v-if="pending" class="text-secondary-600 dark:text-secondary-400 flex-grow flex items-center justify-center">Loading patterns...</div>
      <div v-else-if="error" class="text-red-500 flex-grow flex items-center justify-center">Error loading patterns: {{ error.message }}</div>
      <div v-else-if="!filteredPatterns || filteredPatterns.length === 0" class="text-secondary-600 dark:text-secondary-400 flex-grow flex items-center justify-center">
        <span v-if="selectedMethod || selectedCompetency">No patterns found matching the selected filters.</span>
        <span v-else>No patterns found for this user.</span>
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
          <button @click="displayNodeInfo = null" class="mt-4 btn-secondary text-sm">Close</button>
        </div>

        <!-- Color Legend at the bottom -->
        <div class="absolute bottom-4 right-4 bg-white dark:bg-secondary-800 p-3 rounded-lg shadow-md border border-secondary-200 dark:border-secondary-700">
          <p class="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Node Colors:</p>
          <div class="flex flex-col space-y-1 text-xs">
            <div v-for="(item, index) in legendItems" :key="index" class="flex items-center space-x-2">
              <span :style="{ backgroundColor: item.color }" class="w-4 h-4 rounded-full border border-secondary-300 dark:border-secondary-600"></span>
              <span class="text-secondary-700 dark:text-secondary-300">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import * as d3 from 'd3';
import CircularDendrogram from './graphs/CircularDendrogram.vue';
import type { Pattern, HierarchyNode, DisplayNodeInfo } from './graphs/types';
import { legendItems } from './graphs/utils';

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

// Filter state
const selectedMethod = ref('');
const selectedCompetency = ref('');
const graphType = ref('circular'); // Only 'circular' available currently

// Node info for display on click
const displayNodeInfo = ref<DisplayNodeInfo | null>(null);

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

  // default: single user view
  const root: HierarchyNode = { name: 'You', type: 'user', children: [] };
  const methodMap = new Map<string, HierarchyNode>();

  filteredPatterns.value.forEach(p => {
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

const handleNodeClick = (nodeInfo: DisplayNodeInfo | null) => {
  displayNodeInfo.value = nodeInfo;
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