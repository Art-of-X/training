export interface Pattern {
  id: number;
  userId?: string;
  sparkId?: string;
  messageId: string;
  method: string;
  competency: string;
  spark: string;
  createdAt: string;
  isPredefined: boolean;
  isPredefinedMethod: boolean;
  isPredefinedCompetency: boolean;
}

export interface HierarchyNode {
  name: string;
  type: 'user' | 'method' | 'competency' | 'spark' | 'ai_spark';
  predefined?: boolean;
  predefinedMethod?: boolean;
  predefinedCompetency?: boolean;
  content?: string;
  children?: HierarchyNode[];
}

export interface DisplayNodeInfo {
  label: string;
  type: 'user' | 'method' | 'competency' | 'spark' | 'ai_spark';
  predefined?: boolean;
  predefinedMethod?: boolean;
  predefinedCompetency?: boolean;
  content?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'user' | 'method' | 'competency' | 'spark' | 'ai_spark';
  predefined?: boolean;
  predefinedMethod?: boolean;
  predefinedCompetency?: boolean;
  content?: string;
}

export interface GraphLink {
  source: string;
  target: string;
} 