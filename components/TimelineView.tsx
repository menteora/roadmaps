import React, { useState, useMemo } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { WorkflowNode } from '../types';
import { Plus, Calendar, ArrowRight, GitBranch } from 'lucide-react';
import { Modal } from './ui/Modal';
import { NodeEditor } from './NodeEditor';
import { Button } from './ui/Button';

export const TimelineView: React.FC = () => {
  const { nodes, collapsedNodeIds } = useWorkflow();
  const [editingNode, setEditingNode] = useState<WorkflowNode | undefined>(undefined);
  const [addingChildTo, setAddingChildTo] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter visible nodes same as graph
  const visibleNodes = useMemo(() => {
      const visibleSet = new Set<string>();
      const sorted = [...nodes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
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

  // Sort visible nodes by date descending (newest first)
  const sortedNodes = useMemo(() => {
    return [...visibleNodes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visibleNodes]);

  const handleNodeClick = (node: WorkflowNode) => {
    setEditingNode(node);
    setAddingChildTo(undefined);
    setIsModalOpen(true);
  };

  const handleAddRoot = () => {
    setEditingNode(undefined);
    setAddingChildTo(undefined);
    setIsModalOpen(true);
  };

  const handleAddChild = (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    setEditingNode(undefined);
    setAddingChildTo(parentId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNode(undefined);
    setAddingChildTo(undefined);
  };

  return (
    <>
      <div className="w-full h-full overflow-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-12">
        <div className="max-w-3xl mx-auto">
            
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Calendar className="text-blue-600" />
                    Chronological Timeline
                </h2>
                <Button onClick={handleAddRoot} size="sm">
                    <Plus size={16} className="mr-1" />
                    New Event
                </Button>
            </div>

            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 md:ml-6 space-y-8 pb-12">
                {sortedNodes.map((node, index) => (
                    <div key={node.id} className="relative pl-8 md:pl-12">
                        {/* Dot on line */}
                        <div 
                            className={`
                                absolute -left-[9px] top-1 w-5 h-5 rounded-full border-4 border-slate-50 dark:border-slate-950
                                ${node.status === 'completed' ? 'bg-green-500' : node.status === 'abandoned' ? 'bg-slate-400' : 'bg-blue-500'}
                            `}
                        />
                        
                        {/* Content Card */}
                        <div 
                            onClick={() => handleNodeClick(node)}
                            className={`
                                group relative p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md
                                ${node.status === 'abandoned' 
                                    ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75 grayscale' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                }
                            `}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    {new Date(node.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className={`
                                        text-[10px] uppercase font-bold px-2 py-0.5 rounded-full
                                        ${node.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                          node.status === 'abandoned' ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400' : 
                                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}
                                    `}>
                                        {node.status}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold mb-1">{node.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                                {node.description || 'No description provided.'}
                            </p>

                            {/* Parent Indicators */}
                            {node.parentIds.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                                    <span className="text-xs text-slate-400 flex items-center mr-1">
                                        <GitBranch size={12} className="mr-1"/> From:
                                    </span>
                                    {node.parentIds.map(pid => {
                                        const p = nodes.find(n => n.id === pid);
                                        return p ? (
                                            <span key={pid} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">
                                                {p.title}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    onClick={(e) => handleAddChild(e, node.id)}
                                    title="Branch from here"
                                >
                                    <GitBranch size={14} className="text-blue-600 dark:text-blue-400" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {sortedNodes.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        {nodes.length > 0 
                            ? "All events are currently hidden in collapsed branches." 
                            : "No events found. Start by adding a new event."}
                    </div>
                )}
            </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingNode ? 'Edit Event' : addingChildTo ? 'Branch Event' : 'New Root Event'}
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