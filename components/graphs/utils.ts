import type { GraphNode, HierarchyNode } from './types';

export const getNodeColor = (node: any) => {
  const nodeData = node.data || node;
  if (nodeData.type === 'user') return 'skyblue';
  if (nodeData.type === 'method') return nodeData.predefined ? '#6EE7B7' : '#FBBF24';
  if (nodeData.type === 'competency') return nodeData.predefined ? '#FCA5A5' : '#EF4444';
  if (nodeData.type === 'spark') return nodeData.predefined ? '#D1D5DB' : '#A78BFA';
  return '#6B7280';
};

export const legendItems = [
  { label: 'You', color: 'skyblue' },
  { label: 'Method (Predefined)', color: '#6EE7B7' },
  { label: 'Method (User-Created)', color: '#FBBF24' },
  { label: 'Competency (Predefined)', color: '#FCA5A5' },
  { label: 'Competency (User-Created)', color: '#EF4444' },
  { label: 'Spark (Predefined)', color: '#D1D5DB' },
  { label: 'Spark (User-Created)', color: '#A78BFA' },
]; 