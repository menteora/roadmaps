
import React, { useRef, useState } from 'react';
import { useWorkflow } from '../context/WorkflowContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Download, Upload, Trash2, Sun, Moon, Map, Rows, Columns, Calendar, Plus, X, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

interface ConfirmationState {
  type: 'delete_sheet' | 'reset_sheet';
  title: string;
  message: string;
  action: () => void;
}

export const Toolbar: React.FC = () => {
  const { 
      orientation, setOrientation, 
      resetWorkflow, exportWorkflow, importWorkflow,
      sheets, activeSheetId, switchSheet, createSheet, renameSheet, deleteSheet
  } = useWorkflow();
  
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const getSafeName = () => {
    const rawName = activeSheet?.name || 'roadmap';
    const safeName = rawName.replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    const now = new Date();
    const p = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
    
    return `${safeName}-${timestamp}`;
  };

  const handleExport = () => {
    const data = exportWorkflow();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getSafeName()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportImage = async () => {
    const elementId = orientation === 'timeline' ? 'timeline-content' : 'graph-content';
    const node = document.getElementById(elementId);
    
    if (!node) return;

    setIsExporting(true);
    try {
        // Set background color explicitly to avoid transparency issues or theme mismatch
        const bgColor = theme === 'dark' ? '#09090b' : '#f8fafc';
        
        const dataUrl = await htmlToImage.toPng(node, { 
            backgroundColor: bgColor,
            cacheBust: true, // Prevents CORS issues with cached external images
            skipAutoScale: true, // Prevents layout shifts during capture
            style: {
                transform: 'scale(1)', // Ensure no weird scaling transforms are captured
            }
        });
        
        const link = document.createElement('a');
        link.download = `${getSafeName()}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error('Failed to export image', error);
        alert('Failed to generate image. Please try again.');
    } finally {
        setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        if (evt.target?.result) {
            importWorkflow(evt.target.result as string);
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  // -- Confirmation Handlers --

  const requestDeleteSheet = () => {
      if (sheets.length <= 1) return; // Should be handled by UI state but double check
      setConfirmation({
          type: 'delete_sheet',
          title: 'Delete Sheet',
          message: `Are you sure you want to delete "${activeSheet?.name}"? This action cannot be undone.`,
          action: () => {
              deleteSheet(activeSheetId);
              setConfirmation(null);
          }
      });
  };

  const requestResetWorkflow = () => {
      setConfirmation({
          type: 'reset_sheet',
          title: 'Reset Roadmap',
          message: 'Are you sure you want to clear all tasks in this sheet? This will revert it to the default state.',
          action: () => {
              resetWorkflow();
              setConfirmation(null);
          }
      });
  };

  return (
    <>
        <div className={`fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-40 flex items-center justify-between px-4 sm:px-6 ${isExporting ? 'cursor-wait' : ''}`}>
        
        {/* Left: App Title & Sheet Manager */}
        <div className="flex items-center gap-3 flex-1 overflow-hidden mr-4">
            <div className="bg-blue-600 p-2 rounded-lg text-white shrink-0 hidden sm:block">
                <Map size={20} />
            </div>
            
            <div className="flex items-center gap-2 max-w-full">
                {/* Sheet Selector */}
                <div className="relative group shrink-0">
                    <select 
                        value={activeSheetId} 
                        onChange={(e) => switchSheet(e.target.value)}
                        className="appearance-none bg-slate-100 dark:bg-slate-800 border-none rounded-md py-1.5 pl-3 pr-8 text-sm font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[140px] truncate"
                    >
                        {sheets.map(sheet => (
                            <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1L5 5L9 1"/></svg>
                    </div>
                </div>

                {/* Rename Input */}
                <input 
                    type="text"
                    value={activeSheet?.name || ''}
                    onChange={(e) => activeSheet && renameSheet(activeSheet.id, e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 py-1 text-sm font-semibold w-full min-w-[100px] max-w-[200px]"
                    placeholder="Sheet Name"
                />

                {/* Add Sheet */}
                <Button variant="ghost" size="sm" onClick={createSheet} className="h-8 w-8 p-0 rounded-full" title="Create New Sheet">
                    <Plus size={16} />
                </Button>
                
                {/* Delete Sheet (Only if > 1) */}
                {sheets.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={requestDeleteSheet} className="h-8 w-8 p-0 rounded-full text-red-500 hover:bg-red-50" title="Delete Sheet">
                        <X size={16} />
                    </Button>
                )}
            </div>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-2 shrink-0">
            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mr-2 hidden xs:flex">
                <button 
                    onClick={() => setOrientation('vertical')}
                    className={`p-1.5 rounded-md transition-all ${orientation === 'vertical' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
                    title="Vertical Layout"
                >
                    <Columns size={16} />
                </button>
                <button 
                    onClick={() => setOrientation('horizontal')}
                    className={`p-1.5 rounded-md transition-all ${orientation === 'horizontal' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
                    title="Horizontal Layout"
                >
                    <Rows size={16} />
                </button>
                <button 
                    onClick={() => setOrientation('timeline')}
                    className={`p-1.5 rounded-md transition-all ${orientation === 'timeline' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}
                    title="Chronological Timeline"
                >
                    <Calendar size={16} />
                </button>
            </div>

            <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </Button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            <Button variant="ghost" size="icon" onClick={handleExportImage} disabled={isExporting} title="Export as Image (PNG)">
                <ImageIcon size={18} className={isExporting ? 'animate-pulse text-blue-500' : ''} />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleExport} title="Export Roadmap (JSON)">
                <Download size={18} />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={handleImportClick} title="Import Roadmap">
                <Upload size={18} />
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleFileChange} 
            />
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            <Button variant="ghost" size="icon" onClick={requestResetWorkflow} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Clear Current Sheet">
            <Trash2 size={18} />
            </Button>
        </div>
        </div>

        {/* Confirmation Modal */}
        <Modal
            isOpen={!!confirmation}
            onClose={() => setConfirmation(null)}
            title={confirmation?.title || ''}
        >
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            {confirmation?.message}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-2">
                    <Button variant="secondary" onClick={() => setConfirmation(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmation?.action}>
                        Confirm
                    </Button>
                </div>
            </div>
        </Modal>
    </>
  );
};