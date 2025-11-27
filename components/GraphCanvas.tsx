
import React, { useMemo, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { calculateLayout, getPath } from '../utils/layoutHelper';
import { NODE_WIDTH, NODE_HEIGHT, H_NODE_WIDTH, H_NODE_HEIGHT } from '../constants';
import { Plus, Edit2, GitCommit, Calendar, ChevronDown, ChevronRight, ChevronsDown } from 'lucide-react';
import { Modal } from './ui/Modal';
import { NodeEditor } from './NodeEditor';
import { WorkflowNode } from '../types';

// Inline base64 noise SVG to prevent CORS issues during export
const NOISE_BG = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E";

export const GraphCanvas: React.FC = () => {
  const { nodes, orientation, collapsedNodeIds, toggleNodeCollapse } = useWorkflow();

  // 1. Identify which nodes have children (to decide whether to show the toggle button)
  const nodeChildCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach(n => {
        n.parentIds.forEach(pid => {
            counts[pid] = (counts[pid] || 0) + 1;
        });
    });
    return counts;
  }, [nodes]);

  // 2. Filter nodes based on collapsed state
  // A node is visible if:
  // a) It is a root (no parents)
  // b) At least one of its parents is VISIBLE and NOT COLLAPSED
  const visibleNodes = useMemo(() => {
      const visibleSet = new Set<string>();
      // Sort by date to process parents before children typically
      const sorted = [...nodes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Iterative process to determine visibility down the tree
      // Simple pass might miss complex merges, so we iterate carefully or use topological logic
      // Since DAG is guaranteed by date creation usually, sorted works.
      
      sorted.forEach(node => {
          if (node.parentIds.length === 0) {
              visibleSet.add(node.id);
          } else {
              const hasVisibleParent = node.parentIds.some(pid => 
                  visibleSet.has(pid) && !collapsedNodeIds.includes(pid)
              );
              if (hasVisibleParent) {
                  visibleSet.add(node.id);
              }
          }
      });

      return nodes.filter(n => visibleSet.has(n.id));
  }, [nodes, collapsedNodeIds]);

  const { nodes: renderedNodes, edges, width, height } = useMemo(() => 
    calculateLayout(visibleNodes, orientation), 
  [visibleNodes, orientation]);

  const [editingNode, setEditingNode] = useState<WorkflowNode | undefined>(undefined);
  const [addingChildTo, setAddingChildTo] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleNodeClick = (node: WorkflowNode) => {
    setEditingNode(node);
    setAddingChildTo(undefined);
    setIsModalOpen(true);
  };

  const handleAddChild = (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    setEditingNode(undefined);
    setAddingChildTo(parentId);
    setIsModalOpen(true);
  };

  const handleToggleCollapse = (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      toggleNodeCollapse(nodeId);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNode(undefined);
    setAddingChildTo(undefined);
  };

  return (
    <>
      <div className="w-full h-full overflow-auto bg-slate-50 dark:bg-black/95 transition-colors"
           style={{ backgroundImage: `url("${NOISE_BG}")` }}>
        <div 
          id="graph-content"
          className="relative bg-slate-50 dark:bg-black/95"
          style={{ 
              width: width, 
              height: height, 
              minWidth: '100%', 
              minHeight: '100%',
              backgroundImage: `url("${NOISE_BG}")`
          }}
        >
          <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
            <defs>
               <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
            {edges.map(edge => (
              <path
                key={edge.id}
                d={getPath(edge.sourceX, edge.sourceY, edge.targetX, edge.targetY, orientation)}
                stroke={edge.color}
                strokeWidth="2"
                fill="none"
                strokeDasharray={(edge.status === 'abandoned' || edge.status === 'standby') ? "5,5" : "none"}
                className="transition-all duration-500"
              />
            ))}
          </svg>

          {renderedNodes.map(node => {
            const isCollapsed = collapsedNodeIds.includes(node.id);
            const hasChildren = (nodeChildCounts[node.id] || 0) > 0;

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: orientation === 'vertical' ? NODE_WIDTH : 200,
                  borderColor: node.status === 'active' ? node.color : undefined,
                }}
                className={`
                  group relative flex flex-col p-3 rounded-lg border-2 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md cursor-pointer
                  ${node.status === 'abandoned' 
                      ? 'border-slate-300 bg-slate-100/50 dark:border-slate-700 dark:bg-slate-800/50 grayscale opacity-80' 
                      : node.status === 'completed'
                      ? 'border-green-500/50 bg-green-50/80 dark:bg-green-900/10'
                      : node.status === 'standby'
                      ? 'border-amber-400 border-dashed bg-amber-50 dark:bg-amber-900/10 dark:border-amber-600'
                      : 'bg-white/90 dark:bg-slate-900/90'
                  }
                  ${isCollapsed ? 'border-dashed opacity-90' : ''}
                `}
                onClick={() => handleNodeClick(node)}
              >
                {/* Visual Stack Effect for Collapsed Nodes */}
                {isCollapsed && (
                    <div className="absolute inset-0 bg-inherit border-2 border-inherit rounded-lg -z-10 translate-x-1.5 translate-y-1.5 opacity-60"></div>
                )}

                {/* Dot Connector */}
                <div 
                  className="absolute w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-sm z-10"
                  style={{ 
                      backgroundColor: node.color,
                      top: orientation === 'vertical' ? -6 : '50%',
                      left: orientation === 'vertical' ? '50%' : -6,
                      transform: orientation === 'vertical' ? 'translateX(-50%)' : 'translateY(-50%)',
                      opacity: node.parentIds.length > 0 ? 1 : 0
                  }}
                />

                {/* Status Indicator / Icon */}
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-mono opacity-50 flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(node.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  {node.status === 'abandoned' && <span className="text-[10px] uppercase font-bold text-slate-500">Dead End</span>}
                  {node.status === 'standby' && <span className="text-[10px] uppercase font-bold text-amber-500">Standby</span>}
                </div>

                <h3 className="font-bold text-sm leading-tight mb-1 line-clamp-2">{node.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {node.description || 'No description'}
                </p>

                {/* Actions */}
                <div className={`absolute left-1/2 -translate-x-1/2 flex gap-1 transition-all duration-200 ${isCollapsed ? '-bottom-5 opacity-100' : '-bottom-3 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'}`}>
                   {/* Collapse Toggle */}
                   {hasChildren && (
                       <button
                           onClick={(e) => handleToggleCollapse(e, node.id)}
                           className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full p-1 shadow hover:bg-slate-50 dark:hover:bg-slate-700 ${isCollapsed ? 'ring-2 ring-blue-500' : ''}`}
                           title={isCollapsed ? "Expand Branch" : "Collapse Branch"}
                       >
                           {isCollapsed ? <ChevronsDown size={14} /> : (orientation === 'vertical' ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                       </button>
                   )}
                   
                   {/* Add Child */}
                   {!isCollapsed && (
                       <button 
                           onClick={(e) => handleAddChild(e, node.id)}
                           className="bg-blue-600 text-white rounded-full p-1 shadow hover:bg-blue-700"
                           title="Add Branch"
                       >
                           <Plus size={14} />
                       </button>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingNode ? 'Edit Node' : 'Create Branch'}
      >
        <NodeEditor 
            node={editingNode} 
            parentId={addingChildTo} 
            onClose={closeModal} 
        />
      </Modal>
    </>
  );
};