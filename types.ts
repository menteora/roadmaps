
export type NodeStatus = 'active' | 'completed' | 'abandoned' | 'standby';

export interface WorkflowNode {
  id: string;
  title: string;
  description: string;
  date: string; // ISO String
  status: NodeStatus;
  parentIds: string[];
}

export interface Sheet {
  id: string;
  name: string;
  nodes: WorkflowNode[];
}

export interface RenderedNode extends WorkflowNode {
  x: number;
  y: number;
  lane: number;
  color: string;
}

export interface RenderedEdge {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  color: string;
  status: NodeStatus;
}

export type LayoutOrientation = 'vertical' | 'horizontal' | 'timeline';

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface WorkflowContextType {
  // Sheet Management
  sheets: Sheet[];
  activeSheetId: string;
  createSheet: () => void;
  switchSheet: (id: string) => void;
  renameSheet: (id: string, name: string) => void;
  deleteSheet: (id: string) => void;

  // Active Sheet Logic
  nodes: WorkflowNode[];
  orientation: LayoutOrientation;
  setOrientation: (o: LayoutOrientation) => void;
  addNode: (parentId: string | null, data: Partial<WorkflowNode>) => void;
  updateNode: (id: string, data: Partial<WorkflowNode>) => void;
  deleteNode: (id: string) => void;
  resetWorkflow: () => void; // Clears active sheet
  
  // IO
  importWorkflow: (data: string) => void;
  exportWorkflow: () => string;
  
  // Collapsing features
  collapsedNodeIds: string[];
  toggleNodeCollapse: (id: string) => void;
}
