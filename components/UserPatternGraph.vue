<template>
  <div class="user-pattern-graph">
    <div class="flex flex-col h-full">
      <div class="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-4">
        <!-- Filters -->
        <div class="flex space-x-4">
          <!-- Method Filter -->
          <div class="flex flex-col">
            <label for="method-filter" class="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Filter by Method:</label>
            <select id="method-filter" v-model="selectedMethod" class="p-2 border rounded-md bg-white dark:bg-secondary-700 dark:border-secondary-600 text-secondary-900 dark:text-white">
              <option value="">All Methods</option>
              <option v-for="method in availableMethods" :key="method" :value="method">{{ method }}</option>
            </select>
          </div>

          <!-- Competency Filter -->
          <div class="flex flex-col">
            <label for="competency-filter" class="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Filter by Competency:</label>
            <select id="competency-filter" v-model="selectedCompetency" class="p-2 border rounded-md bg-white dark:bg-secondary-700 dark:border-secondary-600 text-secondary-900 dark:text-white">
              <option value="">All Competencies</option>
              <option v-for="competency in availableCompetencies" :key="competency" :value="competency">{{ competency }}</option>
            </select>
          </div>
        </div>

        <!-- Title for Mental Model Network -->
      </div>

      <div v-if="pending" class="text-secondary-600 dark:text-secondary-400">Loading patterns...</div>
      <div v-else-if="error" class="text-red-500">Error loading patterns: {{ error.message }}</div>
      <div v-else class="flex flex-col h-full">
        <div v-if="graphData.nodes.length <= 1 && fetchedPatterns?.data?.length === 0" class="text-secondary-600 dark:text-secondary-400 flex-grow flex items-center justify-center">
          No patterns found for this user.
        </div>
        <div v-else-if="graphData.nodes.length <= 1 && fetchedPatterns?.data?.length > 0" class="text-secondary-600 dark:text-secondary-400 flex-grow flex items-center justify-center">
          No patterns found matching the selected filters.
        </div>
        <div v-else id="d3-network-container" ref="chartContainer" class="flex-grow"></div>

        <!-- Node Info Display -->
        <div v-if="displayNodeInfo" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-secondary-900 p-4 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 max-w-sm z-50">
          <h3 class="font-bold text-secondary-900 dark:text-white mb-2">{{ displayNodeInfo.label }}</h3>
          <p class="text-sm text-secondary-700 dark:text-secondary-300">Type: {{ displayNodeInfo.type }}</p>
          <p v-if="displayNodeInfo.predefined !== undefined" class="text-sm text-secondary-700 dark:text-secondary-300">Predefined: {{ displayNodeInfo.predefined ? 'Yes' : 'No' }}</p>
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
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import * as d3 from 'd3';

interface Pattern {
  id: number;
  userId: string;
  messageId: string;
  method: string;
  competency: string;
  spark: string;
  createdAt: string;
  isPredefined: boolean;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'user' | 'method' | 'competency' | 'spark';
  predefined?: boolean;
  degree: number; // Added degree property
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string;
  target: string;
}

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
});

const { data: fetchedPatterns, pending, error } = useFetch<{ data: Pattern[] }>(() => `/api/patterns/${props.userId}`);

// Filter state
const selectedMethod = ref('');
const selectedCompetency = ref('');

// Node info for display on click
const displayNodeInfo = ref<GraphNode | null>(null);

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
const graphData = computed(() => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>(); // To keep track of unique nodes

  // Add user node - fixed in center
  const userNodeId = `user_${props.userId}`;
  const userNode: GraphNode = { id: userNodeId, label: 'You', type: 'user', fx: null, fy: null, degree: 0 }; // Added degree property
  nodes.push(userNode);
  nodeMap.set(userNodeId, userNode);

  if (filteredPatterns.value && filteredPatterns.value.length > 0) {
    filteredPatterns.value.forEach(pattern => {
      const method = pattern.method;
      const competency = pattern.competency;
      const spark = pattern.spark;
      const messageId = pattern.messageId;
      const isPredefined = pattern.isPredefined;

      let currentSourceId = userNodeId;

      // Add method node and link
      if (method) {
        const methodNodeId = `method_${method.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (!nodeMap.has(methodNodeId)) {
          const node: GraphNode = { id: methodNodeId, label: `Method: ${method}`, type: 'method', predefined: isPredefined, degree: 0 }; // Added degree
          nodes.push(node);
          nodeMap.set(methodNodeId, node);
        }
        links.push({ source: currentSourceId, target: methodNodeId });
        currentSourceId = methodNodeId;
      }

      // Add competency node and link
      if (competency) {
        const competencyNodeId = `comp_${competency.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (!nodeMap.has(competencyNodeId)) {
          const node: GraphNode = { id: competencyNodeId, label: `Competency: ${competency}`, type: 'competency', predefined: isPredefined, degree: 0 }; // Added degree
          nodes.push(node);
          nodeMap.set(competencyNodeId, node);
        }
        links.push({ source: currentSourceId, target: competencyNodeId });
        currentSourceId = competencyNodeId;
      }

      // Add spark node and link
      if (spark) {
        const sparkNodeId = `spark_${messageId}`;
        let displaySpark = spark; 
        if (displaySpark.length > 50) {
            displaySpark = displaySpark.substring(0, 50) + '...';
        }
        if (!nodeMap.has(sparkNodeId)) {
          const node: GraphNode = { id: sparkNodeId, label: `Spark: ${displaySpark}`, type: 'spark', predefined: isPredefined, degree: 0 }; // Added degree
          nodes.push(node);
          nodeMap.set(sparkNodeId, node);
        }
        links.push({ source: currentSourceId, target: sparkNodeId });
      }
    });
  }

  // Calculate degrees for all nodes
  links.forEach(link => {
    const sourceNode = nodeMap.get(link.source as string);
    const targetNode = nodeMap.get(link.target as string);
    if (sourceNode) sourceNode.degree!++;
    if (targetNode) targetNode.degree!++;
  });

  // Filter out any isolated user node if no patterns match filters
  if (nodes.length === 1 && nodes[0].type === 'user' && filteredPatterns.value.length === 0) {
    return { nodes: [], links: [] };
  }

  return { nodes, links };
});

const chartContainer = ref<HTMLElement | null>(null);

// Legend items based on node coloring logic (only predefined)
const legendItems = computed(() => [
  { label: 'You', color: 'skyblue' },
  { label: 'Method', color: '#6EE7B7' },
  { label: 'Competency', color: '#FCA5A5' },
  { label: 'Spark', color: '#D1D5DB' },
]);

const drawNetworkGraph = () => {
  // Condition to ensure there are nodes beyond just the user node, or if filters are active and might show 0 results
  if (!graphData.value || graphData.value.nodes.length === 0) {
    return;
  }

  const container = d3.select(chartContainer.value!); // Use ref for container
  if (container.empty()) { 
    console.warn('D3 network container not found. Retrying draw in nextTick.');
    nextTick(() => drawNetworkGraph());
    return;
  }
  
  container.html(''); // Clear existing chart

  // Use actual client dimensions of the container
  const width = chartContainer.value?.clientWidth || 800; 
  const height = chartContainer.value?.clientHeight || 600; 

  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);

  // Arrowheads for directed graph
  svg.append('defs').selectAll('marker')
    .data(['arrow'])
    .enter().append('marker')
    .attr('id', String)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 15) // This sets the reference point (tip of arrow) to be just outside the node
    .attr('refY', -0.5)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#999');

  // Determine the domain for the radius scale based on min/max degrees
  const allDegrees = graphData.value.nodes.map(node => node.degree!); 
  const minDegree = d3.min(allDegrees) || 0;
  const maxDegree = d3.max(allDegrees) || 1;

  // Scale for node radius based on degree
  const radiusScale = d3.scaleLinear()
    .domain([minDegree, maxDegree])
    .range([10, 30]); // Min and max radius values

  const simulation = d3.forceSimulation(graphData.value.nodes as GraphNode[])
    .force('link', d3.forceLink(graphData.value.links as GraphLink[]).id((d: any) => d.id).distance(150)) // Further increased distance
    .force('charge', d3.forceManyBody().strength(-1500)) // Even stronger repulsion for more spread
    .force('center', d3.forceCenter(width / 2, height / 2)) 
    .force('collide', d3.forceCollide((d: any) => radiusScale(d.degree) + 5)); // Add padding

  // Fix user node in the center
  const userNodeInSimulation = graphData.value.nodes.find(node => node.type === 'user');
  if (userNodeInSimulation) {
    userNodeInSimulation.fx = width / 2;
    userNodeInSimulation.fy = height / 2;
  }

  const link = svg.append('g')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(graphData.value.links)
    .join('line')
    .attr('marker-end', 'url(#arrow)');

  const node = svg.append('g')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .selectAll('circle')
    .data(graphData.value.nodes)
    .join('circle')
    .attr('r', (d: any) => radiusScale(d.degree)) // Dynamic radius based on degree
    .attr('fill', (d: GraphNode) => {
      // Node coloring logic similar to Python script
      if (d.type === 'user') return 'skyblue';
      if (d.type === 'method') return d.predefined ? '#6EE7B7' : '#FBBF24'; // Tailwind green-300 / amber-400
      if (d.type === 'competency') return d.predefined ? '#FCA5A5' : '#EF4444'; // Tailwind red-300 / red-500
      if (d.type === 'spark') return d.predefined ? '#D1D5DB' : '#A78BFA'; // Tailwind gray-300 / violet-400
      return '#6B7280'; // Default secondary-500
    })
    .on('click', (event, d: GraphNode) => {
      // Display node info temporarily
      displayNodeInfo.value = d;
    })
    .call(d3.drag<SVGCircleElement, GraphNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

  const labels = svg.append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data(graphData.value.nodes)
    .join('text')
    .attr('font-size', 10)
    .attr('fill', '#374151') // secondary-700
    .attr('text-anchor', 'middle')
    .attr('dy', (d: GraphNode) => -radiusScale(d.degree) - 10) // Adjust label position based on dynamic radius
    .text((d: GraphNode) => d.label);

  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    node
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y);

    labels
      .attr('x', (d: any) => d.x)
      .attr('y', (d: any) => d.y);
  });

  function dragstarted(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
};

// Redraw chart when patterns data changes or filters change
watch(graphData, () => {
  if (graphData.value) {
    drawNetworkGraph();
  }
}, { deep: true });

watch([selectedMethod, selectedCompetency], () => {
  drawNetworkGraph();
});

onMounted(() => {
  // Ensure DOM is updated before trying to draw chart
  nextTick(() => {
    // We now have a watch on graphData that handles initial draw, 
    // but this ensures chartContainer ref is available.
    if (chartContainer.value && graphData.value) {
      drawNetworkGraph();
    }
  });
});
</script>

<style scoped>
/* Basic D3 styles - customize as needed */
.user-pattern-graph {
  position: relative; /* Needed for absolute positioning of node info */
  width: 100%;
  height: 100%; /* Take full height of parent */
  display: flex; /* Use flex to layout children */
  flex-direction: column;
}

#d3-network-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

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
  user-select: none; /* Prevent text selection */
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