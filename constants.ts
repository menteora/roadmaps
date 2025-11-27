import { WorkflowNode } from './types';
import { v4 as uuidv4 } from 'uuid';

export const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f43f5e', // rose-500
];

export const INITIAL_NODES: WorkflowNode[] = [
  {
    id: 'root',
    title: 'Project Kickoff',
    description: 'Initial brainstorming and requirement gathering (100% Focus)',
    date: new Date().toISOString(),
    status: 'completed',
    parentIds: [],
  },
];

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 80;
export const GAP_X = 50; // Horizontal spacing between lanes
export const GAP_Y = 120; // Vertical spacing between ranks

// For Horizontal Layout
export const H_NODE_WIDTH = 200;
export const H_NODE_HEIGHT = 100;
export const H_GAP_X = 250;
export const H_GAP_Y = 80;
