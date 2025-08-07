import type { GraphNode, HierarchyNode } from './types';

export const getNodeColor = (node: any) => {
  const nodeData = node.data || node;
  if (nodeData.type === 'user') return 'skyblue';
  if (nodeData.type === 'method') return '#FBBF24';
  if (nodeData.type === 'competency') return '#EF4444';
  if (nodeData.type === 'spark') return '#A78BFA';
  return '#6B7280';
};

export const legendItems = [
  { label: 'You', color: 'skyblue' },
  { label: 'Method', color: '#FBBF24' },
  { label: 'Competency', color: '#EF4444' },
  { label: 'Spark', color: '#A78BFA' },
]; 