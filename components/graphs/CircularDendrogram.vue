<template>
  <div 
    ref="circularContainer" 
    class="w-full h-full overflow-hidden"
    @click="$emit('nodeClick', null)"
  ></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import * as d3 from 'd3';
import type { HierarchyNode, DisplayNodeInfo } from './types';
import { getNodeColor } from './utils';

interface Props {
  hierarchyData: d3.HierarchyNode<HierarchyNode> | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  nodeClick: [nodeInfo: DisplayNodeInfo | null];
}>();

const circularContainer = ref<HTMLElement | null>(null);
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

let resizeObserver: ResizeObserver;

const drawCircularDendrogram = () => {
  if (!props.hierarchyData || !circularContainer.value) {
    const container = d3.select(circularContainer.value);
    if (!container.empty()) container.html('');
    return;
  }

  const container = d3.select(circularContainer.value!);
  container.html('');

  const width = circularContainer.value?.clientWidth || 800; // Dynamic width based on container, default 800
  const height = circularContainer.value?.clientHeight || 600; // Dynamic height based on container, default 600
  const cx = width / 2; // Centered cx
  const cy = height / 2; // Centered cy
  const radius = Math.min(width, height) / 2 - 100; // Restored original padding

  const svg = container.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [-cx, -cy, width, height]) // ViewBox centered
    .attr('style', 'width: 100%; height: auto; font: 10px sans-serif;');

  const mainGroup = svg.append('g');

  // Create a radial tree layout.
  const tree = d3.tree<HierarchyNode>()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent == b.parent ? 10 : 12) / a.depth); // Further increased separation for maximum label display

  // Sort the tree and apply the layout.
  const root = tree(d3.hierarchy(props.hierarchyData.data)
    .sort((a, b) => d3.ascending(a.data.name, b.data.name)));

  // Append links.
  mainGroup.append('g')
    .attr('fill', 'none')
    .attr('stroke', isDark.value ? '#fff' : '#555')
    .attr('stroke-opacity', 0.4)
    .attr('stroke-width', 1.5)
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr('d', d3.linkRadial<any, any>()
      .angle(d => d.x)
      .radius(d => d.y));

  // Append nodes.
  mainGroup.append('g')
    .selectAll('circle')
    .data(root.descendants())
    .join('circle')
    .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
    .attr('fill', (d: any) => getNodeColor(d))
    .attr('r', (d: any) => {
      if (d.data.type === 'user') return 8;
      if (d.data.type === 'spark') return 4;
      return 2.5;
    })
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation();
      emit('nodeClick', {
        label: d.data.name,
        type: d.data.type,
        predefined: d.data.predefined,
        content: d.data.content
      });
    });

  // Append labels.
  mainGroup.append('g')
    .attr('stroke-linejoin', 'round')
    .attr('stroke-width', 3)
    .selectAll('text')
    .data(root.descendants())
    .join('text')
    .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0) rotate(${d.x >= Math.PI ? 180 : 0})`)
    .attr('dy', '0.31em')
    .attr('x', d => d.x < Math.PI === !d.children ? 6 : -6)
    .attr('text-anchor', d => d.x < Math.PI === !d.children ? 'start' : 'end')
    .attr('paint-order', 'stroke')
    .attr('stroke', isDark.value ? 'black' : 'white')
    .attr('fill', isDark.value ? 'white': 'currentColor')
    .text(d => d.data.name)
    .attr('font-size', (d: any) => {
      if (d.data.type === 'user') return '14px';
      if (d.data.type === 'spark') return '10px';
      return '8px'; // Smaller default font size for general nodes
    })
    .attr('font-weight', (d: any) => d.data.type === 'user' ? 'bold' : 'normal');

  // Add zoom behavior (applied to SVG, controls mainGroup)
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 3])
    .on('zoom', (event) => {
      const { transform } = event;
      mainGroup.attr('transform', transform);
    });

  // Apply zoom behavior to SVG
  svg.call(zoom);

  // Calculate adaptive initial zoom out scale
  const naturalGraphSize = 2 * radius; // Graph spans 2 * radius in its natural size
  let adaptiveInitialScale = 1; // Default to 1 (no zoom)
  if (naturalGraphSize > 0 && Math.min(width, height) > 0) {
    // Ensure graph fits within min(width, height) with some padding (0.9 for 10% padding)
    adaptiveInitialScale = Math.min(width, height) / naturalGraphSize * 0.9;
    // Clamp the adaptiveInitialScale within the allowed scaleExtent
    adaptiveInitialScale = Math.max(0.5, Math.min(3, adaptiveInitialScale));
  }
  
  // Apply initial zoom out
  svg.transition()
    .duration(0) // No transition for initial load
    .call(zoom.transform, d3.zoomIdentity.scale(adaptiveInitialScale));
};

const setupResizeObserver = () => {
  if (circularContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      drawCircularDendrogram();
    });
    resizeObserver.observe(circularContainer.value);
  }
};

const cleanupResizeObserver = () => {
  if (circularContainer.value && resizeObserver) {
    resizeObserver.unobserve(circularContainer.value);
  }
};

// Watch for changes
watch(() => props.hierarchyData, () => {
  nextTick(() => {
    drawCircularDendrogram();
  });
}, { deep: true });

watch(colorMode, () => {
  nextTick(() => {
    drawCircularDendrogram();
  });
});

onMounted(() => {
  nextTick(() => {
    setupResizeObserver();
    drawCircularDendrogram();
  });
});

onUnmounted(() => {
  cleanupResizeObserver();
});
</script>

<style scoped>
.links line {
  stroke: #999;
  stroke-opacity: 0.6;
}

.nodes circle {
  stroke: #fff;
  stroke-width: 1.5px;
}

.labels text {
  font-family: sans-serif;
  pointer-events: none;
  user-select: none;
}
</style> 