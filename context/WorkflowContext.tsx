
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { WorkflowContextType, WorkflowNode, LayoutOrientation, Sheet } from '../types';
import { INITIAL_NODES } from '../constants';
import { v4 as uuidv4 } from 'uuid';

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

const STORAGE_KEY = 'roadmap-data-v2';
const DEFAULT_SHEET_ID = 'default-sheet';

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // -- State Initialization --
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration check: if it's an array of sheets
        if (Array.isArray(parsed) && parsed.length > 0 && 'nodes' in parsed[0]) {
            return parsed;
        }
        // Migration from v1 (just nodes array)
        if (Array.isArray(parsed)) {
            return [{ id: DEFAULT_SHEET_ID, name: 'Main Roadmap', nodes: parsed }];
        }
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
    return [{ id: DEFAULT_SHEET_ID, name: 'Main Roadmap', nodes: INITIAL_NODES }];
  });

  const [activeSheetId, setActiveSheetId] = useState<string>(() => {
     // Default to first sheet
     const saved = localStorage.getItem(STORAGE_KEY);
     if (saved) {
         try {
             const parsed = JSON.parse(saved);
             if (Array.isArray(parsed) && parsed.length > 0 && 'nodes' in parsed[0]) {
                 return parsed[0].id;
             }
         } catch(e) {}
     }
     return DEFAULT_SHEET_ID;
  });

  const [orientation, setOrientation] = useState<LayoutOrientation>('vertical');
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<string[]>([]);

  // -- Persistence --
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
  }, [sheets]);

  // -- Derived State (Active Nodes) --
  const activeSheetIndex = sheets.findIndex(s => s.id === activeSheetId);
  const currentSheet = activeSheetIndex !== -1 ? sheets[activeSheetIndex] : sheets[0];
  const nodes = currentSheet?.nodes || [];

  // -- Sheet Management --
  const createSheet = () => {
      const newId = uuidv4();
      const newSheet: Sheet = {
          id: newId,
          name: `Roadmap ${sheets.length + 1}`,
          nodes: INITIAL_NODES
      };
      setSheets(prev => [...prev, newSheet]);
      setActiveSheetId(newId);
      setCollapsedNodeIds([]);
  };

  const switchSheet = (id: string) => {
      if (sheets.some(s => s.id === id)) {
          setActiveSheetId(id);
          setCollapsedNodeIds([]);
      }
  };

  const renameSheet = (id: string, name: string) => {
      setSheets(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const deleteSheet = (id: string) => {
      // Logic for validation moved to UI component to avoid alert()
      if (sheets.length <= 1) {
          return;
      }
      
      const newSheets = sheets.filter(s => s.id !== id);
      setSheets(newSheets);
      
      // If we deleted the active sheet, switch to the first available
      if (activeSheetId === id || !newSheets.some(s => s.id === activeSheetId)) {
          setActiveSheetId(newSheets[0].id);
          setCollapsedNodeIds([]);
      }
  };

  // -- Node Management (Operates on Active Sheet) --
  const updateActiveSheetNodes = (newNodes: WorkflowNode[]) => {
      setSheets(prev => prev.map(s => s.id === activeSheetId ? { ...s, nodes: newNodes } : s));
  };

  const addNode = (parentId: string | null, data: Partial<WorkflowNode>) => {
    const newNode: WorkflowNode = {
      id: uuidv4(),
      title: data.title || 'New Task',
      description: data.description || '',
      date: data.date || new Date().toISOString(),
      status: data.status || 'active',
      parentIds: parentId ? [parentId] : [],
    };
    
    updateActiveSheetNodes([...nodes, newNode]);
    
    // Auto-expand parent
    if (parentId && collapsedNodeIds.includes(parentId)) {
        setCollapsedNodeIds(prev => prev.filter(id => id !== parentId));
    }
  };

  const updateNode = (id: string, data: Partial<WorkflowNode>) => {
    updateActiveSheetNodes(nodes.map(n => n.id === id ? { ...n, ...data } : n));
  };

  const deleteNode = (id: string) => {
    if (id === 'root') return;
    const filtered = nodes.filter(n => n.id !== id);
    const cleaned = filtered.map(n => ({
        ...n,
        parentIds: n.parentIds.filter(pid => pid !== id)
    }));
    updateActiveSheetNodes(cleaned);
    setCollapsedNodeIds(prev => prev.filter(cid => cid !== id));
  };

  const resetWorkflow = () => {
    // Confirmation handled in UI
    updateActiveSheetNodes(INITIAL_NODES);
    setCollapsedNodeIds([]);
  };

  const toggleNodeCollapse = (id: string) => {
      setCollapsedNodeIds(prev => 
        prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
      );
  };

  // -- Import / Export --
  
  const exportWorkflow = () => {
    // Export structure: Array of Sheets
    return JSON.stringify(sheets, null, 2);
  };

  const importWorkflow = (jsonString: string) => {
    try {
        const parsed = JSON.parse(jsonString);
        let importedSheets: Sheet[] = [];

        // Handle Array of Sheets (New Format)
        if (Array.isArray(parsed) && parsed.length > 0 && 'nodes' in parsed[0] && 'name' in parsed[0]) {
            importedSheets = parsed;
        } 
        // Handle Array of Nodes (Old/Simple Format)
        else if (Array.isArray(parsed) && parsed.length > 0 && 'id' in parsed[0]) {
             importedSheets = [{
                 id: uuidv4(),
                 name: 'Imported Roadmap',
                 nodes: parsed
             }];
        } else {
            console.error('Invalid JSON format');
            return;
        }

        // Check if the current environment is in its initial "Pristine" state.
        // Logic: Only 1 sheet exists, it has the default ID, and the nodes match INITIAL_NODES exactly.
        const isDefaultSheetUnmodified = 
            sheets.length === 1 && 
            sheets[0].id === DEFAULT_SHEET_ID &&
            JSON.stringify(sheets[0].nodes) === JSON.stringify(INITIAL_NODES);

        if (isDefaultSheetUnmodified) {
            // REPLACE STRATEGY: Overwrite completely
            // Ensure IDs are unique just in case, though usually unnecessary for full replace
            const preparedSheets = importedSheets.map(s => ({...s, id: s.id || uuidv4()}));
            setSheets(preparedSheets);
            setActiveSheetId(preparedSheets[0].id);
            setCollapsedNodeIds([]);
            console.log(`Import successful. Replaced default sheet with ${preparedSheets.length} sheet(s).`);
        } else {
            // MERGE STRATEGY: Update existing by name, add new if not found
            setSheets(prev => {
                const newSheets = [...prev];
                
                importedSheets.forEach(imported => {
                    const existingIndex = newSheets.findIndex(s => s.name === imported.name);
                    
                    if (existingIndex !== -1) {
                        // Update existing sheet
                        newSheets[existingIndex] = {
                            ...newSheets[existingIndex],
                            nodes: imported.nodes
                        };
                    } else {
                        // Add new sheet, ensure unique ID
                        newSheets.push({
                            ...imported,
                            id: imported.id || uuidv4() // Ensure ID
                        });
                    }
                });
                return newSheets;
            });
            console.log(`Import successful. Merged ${importedSheets.length} sheet(s).`);
        }

    } catch (e) {
        console.error('Failed to parse JSON', e);
    }
  };

  return (
    <WorkflowContext.Provider value={{
      sheets,
      activeSheetId,
      createSheet,
      switchSheet,
      renameSheet,
      deleteSheet,
      
      nodes,
      orientation,
      setOrientation,
      addNode,
      updateNode,
      deleteNode,
      resetWorkflow,
      importWorkflow,
      exportWorkflow,
      collapsedNodeIds,
      toggleNodeCollapse
    }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflow must be used within a WorkflowProvider');
  return context;
};
