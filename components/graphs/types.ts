export interface Pattern {
  id: number;
  userId: string;
  messageId: string;
  method: string;
  competency: string;
  spark: string;
  createdAt: string;
  isPredefined: boolean;
}

export interface HierarchyNode {
  name: string;
  type: 'user' | 'method' | 'competency' | 'spark';
  predefined?: boolean;
  content?: string;
  children?: HierarchyNode[];
}

export interface DisplayNodeInfo {
  label: string;
  type: 'user' | 'method' | 'competency' | 'spark';
  predefined?: boolean;
  content?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'user' | 'method' | 'competency' | 'spark';
  predefined?: boolean;
  content?: string;
}

export interface GraphLink {
  source: string;
  target: string;
} 