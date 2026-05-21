'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Menu, Loader2 } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Load state from localStorage on mount (safe for Next.js SSR)
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-open');
    if (savedState !== null) {
      setIsSidebarOpen(savedState === 'true');
    }
  }, []);

  // Whenever path or search params change, route load is complete!
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  // Intercept all sidebar navigation link clicks to trigger the loader instantly
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        // Only trigger loader for dashboard subpages and only if it's a new route
        if (href && href.startsWith('/dashboard') && href !== pathname) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => {
      document.removeEventListener('click', handleLinkClick);
    };
  }, [pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar-open', String(newState));
      return newState;
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors relative overflow-hidden">
      {/* Global premium semi-transparent glassmorphic loader */}
      {isNavigating && (
        <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/20 backdrop-blur-[2px] z-[9999] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20 dark:border-white/5 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-[0.2em] uppercase animate-pulse">Loading Portal...</p>
          </div>
        </div>
      )}

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

