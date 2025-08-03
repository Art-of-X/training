<template>
  <div 
    ref="chartContainer" 
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

const chartContainer = ref<HTMLElement | null>(null);
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

let resizeObserver: ResizeObserver;

const drawNetworkGraph = () => {
  if (!props.hierarchyData || !chartContainer.value) {
    const container = d3.select(chartContainer.value);
    if (!container.empty()) container.html('');
    return;
  }
  
  const container = d3.select(chartContainer.value!);
  container.html('');

  const width = chartContainer.value?.clientWidth || 800;
  const height = chartContainer.value?.clientHeight || 600;
  const radius = Math.min(width, height) / 2 - 80;

  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  // Create the tree layout
  const tree = d3.tree<HierarchyNode>()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

  const root = tree(props.hierarchyData);
  
  // Create links with curved paths
  const link = g.selectAll('.link')
    .data(root.links())
    .enter().append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', isDark.value ? '#fff' : '#333') // White branches in dark, dark in light
    .attr('stroke-width', 1.5) 
    .attr('d', d3.linkRadial<any, any>()
      .angle(d => d.x)
      .radius(d => d.y));

  // Create nodes
  const node = g.selectAll('.node')
    .data(root.descendants())
    .enter().append('g')
    .attr('class', d => `node ${d.children ? 'node--internal' : 'node--leaf'}`)
    .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y}, 0)`)
    .style('cursor', 'pointer')
    .attr('visibility', d => d.depth === 0 ? 'hidden' : 'visible') // Hide the root node
    .on('click', (event, d) => {
      event.stopPropagation();
      emit('nodeClick', {
        label: d.data.name,
        type: d.data.type,
        predefined: d.data.predefined,
        content: d.data.content
      });
    });

  // Add circles to leaf nodes only
  const leafNodes = node.filter(d => !d.children);

  leafNodes.append('circle')
    .attr('r', 3) // Smaller nodes
    .attr('fill', d => getNodeColor(d))
    .attr('stroke', d => getNodeColor(d))
    .attr('stroke-width', 2);

  // Add labels to leaf nodes only
  leafNodes.append('text')
    .attr('dy', '0.31em')
    .attr('x', d => d.x < Math.PI ? 8 : -8)
    .attr('text-anchor', d => d.x < Math.PI ? 'start' : 'end')
    .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
    .attr('font-size', '10px')
    .attr('font-family', 'monospace')
    .attr('fill', d => getNodeColor(d)) // Colored labels
    .text(d => d.data.name)
    .clone(true).lower()
    .attr('stroke', isDark.value ? 'black' : 'white') // Dynamic halo for readability
    .attr('stroke-width', 3);

  // Add zoom and pan
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 4])
    .on('zoom', (event) => {
      g.attr('transform', `translate(${width / 2}, ${height / 2}) ${event.transform}`);
    });

  svg.call(zoom);

  // Initial zoom to fit
  const bounds = g.node()!.getBBox();
  const fullWidth = bounds.width;
  const fullHeight = bounds.height;
  
  if (fullWidth > 0 && fullHeight > 0) {
    const scale = Math.min(width / fullWidth, height / fullHeight) * 0.9;
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale);
    
    svg.transition()
      .duration(750)
      .call(zoom.transform, initialTransform);
  }
};

const setupResizeObserver = () => {
  if (chartContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      drawNetworkGraph();
    });
    resizeObserver.observe(chartContainer.value);
  }
};

const cleanupResizeObserver = () => {
  if (chartContainer.value && resizeObserver) {
    resizeObserver.unobserve(chartContainer.value);
  }
};

// Watch for changes
watch(() => props.hierarchyData, () => {
  nextTick(() => {
    drawNetworkGraph();
  });
}, { deep: true });

watch(colorMode, () => {
  nextTick(() => {
    drawNetworkGraph();
  });
});

onMounted(() => {
  nextTick(() => {
    setupResizeObserver();
    drawNetworkGraph();
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