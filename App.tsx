import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import { Toolbar } from './components/Toolbar';
import { GraphCanvas } from './components/GraphCanvas';
import { TimelineView } from './components/TimelineView';

const MainContent: React.FC = () => {
    const { orientation } = useWorkflow();

    return (
        <main className="flex-1 relative overflow-hidden pt-16 h-full w-full">
            {orientation === 'timeline' ? (
                <TimelineView />
            ) : (
                <GraphCanvas />
            )}
        </main>
    );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <WorkflowProvider>
        <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
          <Toolbar />
          <MainContent />
        </div>
      </WorkflowProvider>
    </ThemeProvider>
  );
};

export default App;