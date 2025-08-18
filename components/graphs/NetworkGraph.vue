<template>
  <div 
    ref="chartContainer" 
    class="w-full h-full overflow-hidden"
  ></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
import * as d3 from 'd3';
import type { HierarchyNode, DisplayNodeInfo, GraphNode, GraphLink } from './types';
import { getNodeColor } from './utils';

interface Props {
  hierarchyData?: d3.HierarchyNode<HierarchyNode> | null;
  graphNodes?: GraphNode[];
  graphLinks?: GraphLink[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  nodeClick: [nodeInfo: DisplayNodeInfo | null, event?: MouseEvent];
}>();

const chartContainer = ref<HTMLElement | null>(null);
const colorMode = useColorMode();
const isDark = computed(() => colorMode.value === 'dark');

let resizeObserver: ResizeObserver;

const drawNetworkGraph = () => {
  const container = d3.select(chartContainer.value as HTMLElement | null);
  if (!chartContainer.value || container.empty()) return;
  container.html('');

  const width = chartContainer.value?.clientWidth || 800;
  const height = chartContainer.value?.clientHeight || 600;

  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  // If graph data is provided, render a force-directed network
  if (props.graphNodes && props.graphLinks && props.graphNodes.length > 0) {
    const g = svg.append('g');

    const link = g.append('g')
      .attr('stroke', isDark.value ? '#777' : '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(props.graphLinks)
      .join('line')
      .attr('stroke-width', 1.5);

    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(props.graphNodes)
      .join('g')
      .style('cursor', 'default')
      .on('mouseenter', (event, d: GraphNode) => {
        event.stopPropagation();
        emit('nodeClick', {
          label: d.name,
          type: d.type,
          predefined: d.predefined,
          content: d.content,
        }, event);
      })
      .on('mouseleave', () => {
        emit('nodeClick', null);
      })
      .call(d3.drag()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Rectangles with same sizing rules as CircularDendrogram
    nodeGroup.append('rect')
      .attr('fill', (d: any) => getNodeColor(d))
      .attr('width', (d: any) => {
        if (d.type === 'user' || d.type === 'method' || d.type === 'competency') return 16;
        if (d.type === 'ai_spark') return 14;
        if (d.type === 'spark') return 10;
        return 7;
      })
      .attr('height', (d: any) => {
        if (d.type === 'user' || d.type === 'method' || d.type === 'competency') return 16;
        if (d.type === 'ai_spark') return 14;
        if (d.type === 'spark') return 10;
        return 7;
      })
      .attr('x', (d: any) => {
        if (d.type === 'user' || d.type === 'method' || d.type === 'competency') return -8;
        if (d.type === 'ai_spark') return -7;
        if (d.type === 'spark') return -5;
        return -3.5;
      })
      .attr('y', (d: any) => {
        if (d.type === 'user' || d.type === 'method' || d.type === 'competency') return -8;
        if (d.type === 'ai_spark') return -7;
        if (d.type === 'spark') return -5;
        return -3.5;
      });

    // Labels with same font rules
    nodeGroup.append('text')
      .attr('dy', '0.31em')
      .attr('x', 12)
      .attr('text-anchor', 'start')
      .attr('paint-order', 'stroke')
      .attr('stroke', isDark.value ? 'black' : 'white')
      .attr('fill', isDark.value ? 'white' : 'currentColor')
      .attr('font-size', (d: any) => {
        if (d.type === 'user') return '14px';
        if (d.type === 'ai_spark') return '12px';
        if (d.type === 'spark') return '10px';
        return '8px';
      })
      .attr('font-weight', (d: any) => d.type === 'user' || d.type === 'ai_spark' ? 'bold' : 'normal')
      .text((d: any) => d.name);

    // Simulation
    const simulation = d3.forceSimulation(props.graphNodes as any)
      .force('link', d3.forceLink(props.graphLinks as any)
        .id((d: any) => d.id)
        .distance((l: any) => {
          const s = typeof l.source === 'object' ? l.source.type : 'spark';
          const t = typeof l.target === 'object' ? l.target.type : 'spark';
          if (s === 'user' || t === 'user') return 220;
          if (s === 'ai_spark' || t === 'ai_spark') return 200;
          if (s === 'method' || t === 'method') return 160;
          if (s === 'competency' || t === 'competency') return 120;
          return 100;
        })
        .strength(0.6)
      )
      .force('charge', d3.forceManyBody()
        .strength((d: any) => {
          if (d.type === 'user') return -600;
          if (d.type === 'ai_spark') return -500;
          if (d.type === 'method') return -400;
          if (d.type === 'competency') return -250;
          return -150;
        })
        .distanceMax(600)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('x', d3.forceX(width / 2).strength(0.02))
      .force('y', d3.forceY(height / 2).strength(0.02))
      .force('collision', d3.forceCollide().radius((d: any) => {
        if (d.type === 'user') return 24;
        if (d.type === 'ai_spark') return 22;
        if (d.type === 'method') return 20;
        if (d.type === 'competency') return 16;
        return 12;
      }).strength(0.9));

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (typeof d.source === 'object' ? d.source.x : 0))
        .attr('y1', (d: any) => (typeof d.source === 'object' ? d.source.y : 0))
        .attr('x2', (d: any) => (typeof d.target === 'object' ? d.target.x : 0))
        .attr('y2', (d: any) => (typeof d.target === 'object' ? d.target.y : 0));

      nodeGroup.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);
    return;
  }

  // Fallback: if no graph data, render radial tree if hierarchy provided
  if (!props.hierarchyData) return;

  const radius = Math.min(width, height) / 2 - 80;
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const tree = d3.tree<HierarchyNode>()
    .size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

  const root = tree(props.hierarchyData);

  const link = g.selectAll('.link')
    .data(root.links())
    .enter().append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', isDark.value ? '#fff' : '#333')
    .attr('stroke-width', 1.5)
    .attr('d', d3.linkRadial<any, any>()
      .angle(d => d.x)
      .radius(d => d.y));

  const node = g.selectAll('.node')
    .data(root.descendants())
    .enter().append('g')
    .attr('class', d => `node ${d.children ? 'node--internal' : 'node--leaf'}`)
    .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y}, 0)`)
    .style('cursor', 'default')
    .attr('visibility', d => d.depth === 0 ? 'hidden' : 'visible')
    .on('mouseenter', (event, d) => {
      event.stopPropagation();
      emit('nodeClick', {
        label: d.data.name,
        type: d.data.type,
        predefined: d.data.predefined,
        content: d.data.content
      }, event);
    })
    .on('mouseleave', () => {
      emit('nodeClick', null);
    });

  const leafNodes = node.filter(d => !d.children);

  leafNodes.append('circle')
    .attr('r', 3)
    .attr('fill', d => getNodeColor(d))
    .attr('stroke', d => getNodeColor(d))
    .attr('stroke-width', 2);

  leafNodes.append('text')
    .attr('dy', '0.31em')
    .attr('x', d => d.x < Math.PI ? 8 : -8)
    .attr('text-anchor', d => d.x < Math.PI ? 'start' : 'end')
    .attr('transform', d => d.x >= Math.PI ? 'rotate(180)' : null)
    .attr('font-size', '10px')
    .attr('font-family', 'monospace')
    .attr('fill', d => getNodeColor(d))
    .text(d => d.data.name)
    .clone(true).lower()
    .attr('stroke', isDark.value ? 'black' : 'white')
    .attr('stroke-width', 3);

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 4])
    .on('zoom', (event) => {
      g.attr('transform', `translate(${width / 2}, ${height / 2}) ${event.transform}`);
    });

  svg.call(zoom as any);

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
watch(() => [props.hierarchyData, props.graphNodes, props.graphLinks, isDark.value], () => {
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