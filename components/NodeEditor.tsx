import React, { useState, useEffect } from 'react';
import { WorkflowNode, NodeStatus } from '../types';
import { Button } from './ui/Button';
import { useWorkflow } from '../context/WorkflowContext';

interface NodeEditorProps {
  node?: WorkflowNode; // If null, we are creating
  parentId?: string;   // If provided, we are creating a child of this
  onClose: () => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({ node, parentId, onClose }) => {
  const { addNode, updateNode, deleteNode, nodes } = useWorkflow();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    status: 'active' as NodeStatus,
    parentIds: [] as string[]
  });

  useEffect(() => {
    if (node) {
      setFormData({
        title: node.title,
        description: node.description,
        date: node.date.split('T')[0],
        status: node.status,
        parentIds: node.parentIds
      });
    } else {
        // Creating new
        setFormData(prev => ({ ...prev, parentIds: parentId ? [parentId] : [] }));
    }
  }, [node, parentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (node) {
      updateNode(node.id, {
        ...formData,
        date: new Date(formData.date).toISOString()
      });
    } else {
      // Create logic needs simplified signature, but allows complex edits later
      addNode(parentId || null, {
        ...formData,
        date: new Date(formData.date).toISOString()
      });
    }
    onClose();
  };

  const handleMergeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const pid = e.target.value;
      if (pid && !formData.parentIds.includes(pid)) {
          setFormData(prev => ({
              ...prev,
              parentIds: [...prev.parentIds, pid]
          }));
      }
  };

  const removeParent = (pid: string) => {
      if (formData.parentIds.length <= 1 && !node) {
          // Prevent removing last parent when creating, keeping tree structure valid for now
           return;
      }
      setFormData(prev => ({
          ...prev,
          parentIds: prev.parentIds.filter(id => id !== pid)
      }));
  };

  // Potential merge candidates: Nodes that are older than this one (simplified logic)
  const potentialParents = nodes.filter(n => n.id !== node?.id && !formData.parentIds.includes(n.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input 
          required
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formData.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
          placeholder="Task Name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea 
          className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
          placeholder="Brief details..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input 
            type="date"
            required
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
            />
        </div>
        <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select 
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.status}
            onChange={e => setFormData({...formData, status: e.target.value as NodeStatus})}
            >
                <option value="active" className="text-black">Active</option>
                <option value="completed" className="text-black">Completed</option>
                <option value="abandoned" className="text-black">Abandoned</option>
            </select>
        </div>
      </div>

      {/* Advanced: Merge Parents */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <label className="block text-sm font-medium mb-2">Connected Parents (Merge)</label>
          <div className="flex flex-wrap gap-2 mb-2">
              {formData.parentIds.map(pid => {
                  const pNode = nodes.find(n => n.id === pid);
                  return (
                      <span key={pid} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-xs px-2 py-1 rounded">
                          {pNode?.title || 'Unknown'}
                          <button type="button" onClick={() => removeParent(pid)} className="hover:text-red-500">×</button>
                      </span>
                  )
              })}
          </div>
          <select 
             onChange={handleMergeSelect}
             className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
             value=""
          >
              <option value="" disabled>Add another parent source...</option>
              {potentialParents.map(n => (
                  <option key={n.id} value={n.id} className="text-black">
                      {n.title} ({n.date.split('T')[0]})
                  </option>
              ))}
          </select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {node && node.id !== 'root' && (
            <Button type="button" variant="danger" onClick={() => { deleteNode(node.id); onClose(); }}>
                Delete
            </Button>
        )}
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit">{node ? 'Save Changes' : 'Create Branch'}</Button>
      </div>
    </form>
  );
};
