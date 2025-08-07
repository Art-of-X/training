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
import { useDynamicColors } from '~/composables/useDynamicColors';

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

  const width = circularContainer.value?.clientWidth || 800;
  const height = circularContainer.value?.clientHeight || 600;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 100;

  const svg = container.append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [-cx, -cy, width, height])
    .attr('style', 'width: 100%; height: auto; font: 10px sans-serif;');

  const mainGroup = svg.append('g');

  const tree = d3.tree<HierarchyNode>()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent == b.parent ? 10 : 12) / a.depth);

  const root = tree(d3.hierarchy(props.hierarchyData.data)
    .sort((a, b) => d3.ascending(a.data.name, b.data.name)));

  const links = mainGroup.append('g')
    .attr('fill', 'none')
    .attr('stroke', isDark.value ? '#fff' : '#555')
    .attr('stroke-width', 10)
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr('d', (d: any) => {
      const start = d3.pointRadial(d.source.x, d.source.y);
      const end = d3.pointRadial(d.target.x, d.target.y);
      return `M${start[0]},${start[1]}L${end[0]},${end[1]}`;
    });

  const nodes = mainGroup.append('g')
    .selectAll('rect')
    .data(root.descendants())
    .join('rect')
    .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
    .attr('fill', (d: any) => getNodeColor(d))
    .attr('width', (d: any) => {
      if (d.data.type === 'user' || d.data.type === 'method' || d.data.type === 'competency') return 16;
      if (d.data.type === 'spark') return 10;
      return 7;
    })
    .attr('height', (d: any) => {
      if (d.data.type === 'user' || d.data.type === 'method' || d.data.type === 'competency') return 16;
      if (d.data.type === 'spark') return 10;
      return 7;
    })
    .attr('x', (d: any) => {
      if (d.data.type === 'user' || d.data.type === 'method' || d.data.type === 'competency') return -8;
      if (d.data.type === 'spark') return -5;
      return -3.5;
    })
    .attr('y', (d: any) => {
      if (d.data.type === 'user' || d.data.type === 'method' || d.data.type === 'competency') return -8;
      if (d.data.type === 'spark') return -5;
      return -3.5;
    })
    .style('cursor', 'grab')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))
    .on('click', (event, d) => {
      event.stopPropagation();
      emit('nodeClick', {
        label: d.data.name,
        type: d.data.type,
        predefined: d.data.predefined,
        content: d.data.content
      });
    });

  const labels = mainGroup.append('g')
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
    .attr('fill', isDark.value ? 'white' : 'currentColor')
    .text(d => d.data.name)
    .attr('font-size', (d: any) => {
      if (d.data.type === 'user') return '14px';
      if (d.data.type === 'spark') return '10px';
      return '8px';
    })
    .attr('font-weight', (d: any) => d.data.type === 'user' ? 'bold' : 'normal');

  function dragstarted(event: any) {
    d3.select(event.sourceEvent.target).raise();
  }

  function dragged(event: any, d: any) {
    const [newX, newY] = d3.pointer(event, mainGroup.node());
    const newRadius = Math.sqrt(newX * newX + newY * newY);
    let newAngle = Math.atan2(newY, newX) + Math.PI / 2;

    d.y = newRadius;
    d.x = newAngle;

    updatePositions();
  }

  function dragended() {
    // No action needed
  }

  function updatePositions() {
    links.attr('d', (d: any) => {
      const start = d3.pointRadial(d.source.x, d.source.y);
      const end = d3.pointRadial(d.target.x, d.target.y);
      return `M${start[0]},${start[1]}L${end[0]},${end[1]}`;
    });

    nodes.attr('transform', (d: any) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`);
    labels.attr('transform', (d: any) => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0) rotate(${d.x >= Math.PI ? 180 : 0})`);
  }

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 3])
    .on('zoom', (event) => {
      const { transform } = event;
      mainGroup.attr('transform', transform);
    });

  svg.call(zoom);

  const naturalGraphSize = 2 * radius;
  let adaptiveInitialScale = 1;
  if (naturalGraphSize > 0 && Math.min(width, height) > 0) {
    adaptiveInitialScale = Math.min(width, height) / naturalGraphSize * 0.9;
    adaptiveInitialScale = Math.max(0.5, Math.min(3, adaptiveInitialScale));
  }
  
  svg.transition()
    .duration(0)
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