/**
 * @file App.tsx
 * @description Main application component that handles the overall layout, routing between views,
 * and global state management for the sidebar and selected company.
 */

import { useState } from 'react';
import Dashboard from './components/Dashboard';
import ApplicationList from './components/ApplicationList';
import ApplicationForm from './components/ApplicationForm';
import CompanyView from './components/CompanyView';
import KanbanBoard from './components/KanbanBoard';
import type { Application } from './types/index';
import { LayoutDashboard, List, Briefcase, Kanban, PanelLeft, Settings } from 'lucide-react';
import { SettingsProvider } from './contexts/SettingsContext';
import SettingsPage from './components/SettingsPage';

// Import CSS
import './styles/index.css';

type View = 'dashboard' | 'list' | 'company' | 'board' | 'settings';

/**
 * Root component of the application.
 * Manages the sidebar navigation and conditionally renders the active view.
 */
function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<Application | null | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleViewCompany = (company: string) => {
    setSelectedCompany(company);
    setCurrentView('company');
  };

  const handleSave = () => {
    setLastUpdated(Date.now());
  };

  return (
    <SettingsProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
        {/* Sidebar */}
        <aside
          className={`glass-card flex flex-col pt-6 transition-all duration-300 ease-in-out
            ${isSidebarOpen
              ? 'w-64 m-4 mr-0 opacity-100 translate-x-0'
              : 'w-0 m-4 mr-0 p-0 opacity-0 -translate-x-full overflow-hidden border-0'}`}
        >
          <div className="px-6 mb-8 flex items-center space-x-2 text-blue-400">
            <Briefcase size={28} />
            <span className="text-xl font-bold tracking-tight whitespace-nowrap">Applytics</span>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-hidden">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
              ${currentView === 'dashboard'
                  ? 'bg-blue-600/20 text-blue-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
            >
              <LayoutDashboard size={20} className="min-w-[20px]" />
              <span className="whitespace-nowrap">Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentView('list')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
              ${['list', 'company'].includes(currentView)
                  ? 'bg-blue-600/20 text-blue-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
            >
              <List size={20} className="min-w-[20px]" />
              <span className="whitespace-nowrap">Applications</span>
            </button>

            <button
              onClick={() => setCurrentView('board')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
              ${currentView === 'board'
                  ? 'bg-blue-600/20 text-blue-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}
            >
              <Kanban size={20} className="min-w-[20px]" />
              <span className="whitespace-nowrap">Board</span>
            </button>
          </nav>

          <div className="px-4 pb-2">
            <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                ${currentView === 'settings'
                  ? 'bg-blue-600/20 text-blue-400 font-semibold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <Settings size={20} className="min-w-[20px]" />
              <span className="whitespace-nowrap">Settings</span>
            </button>
          </div>

          <div className="p-4 text-xs text-center text-slate-500 whitespace-nowrap">
            v1.0.0
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 flex flex-col">
          <div className="flex items-center mb-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              <PanelLeft size={20} />
            </button>
          </div>

          <div className="h-full min-w-[768px]">
            {currentView === 'dashboard' ? (
              <Dashboard />
            ) : currentView === 'company' && selectedCompany ? (
              <CompanyView
                companyName={selectedCompany}
                onBack={() => setCurrentView('list')}
                onEdit={(app) => setEditingApp(app)}
                lastUpdated={lastUpdated}
              />
            ) : currentView === 'board' ? (
              <KanbanBoard
                lastUpdated={lastUpdated}
                onEdit={(app) => setEditingApp(app)}
              />
            ) : currentView === 'settings' ? (
              <SettingsPage />
            ) : (
              <ApplicationList
                onEdit={(app) => setEditingApp(app ? app : null)}
                onViewCompany={handleViewCompany}
                lastUpdated={lastUpdated}
              />
            )}
          </div>
        </main>

        {/* Modal */}
        {editingApp !== undefined && (
          <ApplicationForm
            initialData={editingApp}
            onClose={() => setEditingApp(undefined)}
            onSave={handleSave}
          />
        )}
      </div>
    </SettingsProvider>
  );
}

export default App;
