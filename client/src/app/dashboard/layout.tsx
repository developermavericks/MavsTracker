'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Load state from localStorage on mount (safe for Next.js SSR)
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-open');
    if (savedState !== null) {
      setIsSidebarOpen(savedState === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar-open', String(newState));
      return newState;
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors relative overflow-hidden">
      {/* Sidebar container with smooth width/opacity transition */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'
        } flex-shrink-0 overflow-hidden h-full z-50`}
      >
        <div className="w-64 h-full">
          <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto h-full relative transition-all duration-300">
        {/* Floating toggle button when sidebar is hidden */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="fixed top-6 left-6 z-[49] p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center cursor-pointer animate-in fade-in zoom-in duration-300"
            title="Show Sidebar"
          >
            <Menu className="w-5 h-5 text-blue-600" />
          </button>
        )}

        <div className={`max-w-7xl mx-auto transition-all duration-300 ${!isSidebarOpen ? 'pl-14' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
}

