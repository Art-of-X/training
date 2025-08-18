<template>
  <div class="w-full h-full relative">
    <div class="flex-grow relative w-full h-full min-h-0">
      <div v-if="pending" class="text-secondary-600 dark:text-secondary-400 flex items-center justify-center h-full">Loading patterns...</div>
      <div v-else-if="error" class="text-red-500 flex items-center justify-center h-full">Error loading patterns: {{ error.message }}</div>
      <div v-else-if="!graphNodes.length" class="text-secondary-600 dark:text-secondary-400 flex items-center justify-center h-full">No patterns found.</div>
      <div v-else class="absolute inset-0">
        <NetworkGraph
          :graph-nodes="graphNodes"
          :graph-links="graphLinks"
          @node-click="handleNodeClick"
          class="w-full h-full"
        />
      </div>
    </div>

    <!-- Node Info Display -->
    <div v-if="displayNodeInfo" class="absolute pointer-events-none p-3 rounded-lg shadow-lg border max-w-sm z-50 transition-opacity duration-200" :style="{ 
      backgroundColor: primaryColor,
      borderColor: primaryColor,
      color: secondaryColor
    }">
      <h3 class="font-bold mb-2">{{ displayNodeInfo.type === 'spark' ? 'Spark' : displayNodeInfo.label }}</h3>
      <p v-if="displayNodeInfo.content" class="text-sm italic mb-2">"{{ displayNodeInfo.content }}"</p>
      <p class="text-sm">Type: {{ displayNodeInfo.type }}</p>
      <p v-if="displayNodeInfo.predefined !== undefined" class="text-sm">Predefined: {{ displayNodeInfo.predefined ? 'Yes' : 'No' }}</p>
    </div>

    <!-- Color Legend -->
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import NetworkGraph from '~/components/graphs/NetworkGraph.vue';
import type { Pattern, DisplayNodeInfo } from '~/components/graphs/types';
import { legendItems } from '~/components/graphs/utils';
import { useDynamicColors } from '~/composables/useDynamicColors';

const { data, pending, error } = useFetch<{ data: Pattern[] }>(() => '/api/patterns/all');
const { primaryColor, secondaryColor } = useDynamicColors();

const displayNodeInfo = ref<DisplayNodeInfo | null>(null);
const handleNodeClick = (nodeInfo: DisplayNodeInfo | null, event?: MouseEvent) => {
  displayNodeInfo.value = nodeInfo;
  if (event && nodeInfo) {
    // For now, just use the nodeInfo without mouse tracking
    // You can add mouse tracking here if needed
  }
};

const graphNodes = computed(() => {
  const patterns = data.value?.data ?? [];
  const nodesMap = new Map<string, any>();

  for (const p of patterns) {
    const userId = p.userId || 'unknown';
    const userNodeId = `user:${userId}`;
    if (!nodesMap.has(userNodeId)) {
      nodesMap.set(userNodeId, { id: userNodeId, name: `User ${userId.slice(0, 8)}`, type: 'user' });
    }

    if (p.method) {
      const methodId = `method:${p.method}`;
      if (!nodesMap.has(methodId)) nodesMap.set(methodId, { id: methodId, name: p.method, type: 'method', predefined: p.isPredefined });
    }
    if (p.competency) {
      const compId = `competency:${p.competency}`;
      if (!nodesMap.has(compId)) nodesMap.set(compId, { id: compId, name: p.competency, type: 'competency', predefined: p.isPredefined });
    }
    if (p.spark) {
      const sparkId = `spark:${p.id}`;
      if (!nodesMap.has(sparkId)) nodesMap.set(sparkId, { id: sparkId, name: `ID_${String(p.id).padStart(3, '0')}`, type: 'spark', content: p.spark, predefined: p.isPredefined });
    }
  }

  return Array.from(nodesMap.values());
});

const graphLinks = computed(() => {
  const patterns = data.value?.data ?? [];
  const links: any[] = [];
  for (const p of patterns) {
    const userId = p.userId || 'unknown';
    const userNodeId = `user:${userId}`;

    if (p.method) {
      const methodId = `method:${p.method}`;
      links.push({ source: userNodeId, target: methodId });
      if (p.competency) {
        const compId = `competency:${p.competency}`;
        links.push({ source: methodId, target: compId });
        if (p.spark) {
          const sparkId = `spark:${p.id}`;
          links.push({ source: compId, target: sparkId });
        }
      } else if (p.spark) {
        const sparkId = `spark:${p.id}`;
        links.push({ source: methodId, target: sparkId });
      }
    }
  }
  return links;
});
</script>

<style scoped>
</style>


