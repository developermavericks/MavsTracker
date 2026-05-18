'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, User, Settings, LogOut, Calendar, Loader2, Moon, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

const menuItems = [
  { name: 'My Allocations', icon: Users, href: '/dashboard/team', color: 'text-emerald-600' },
  { name: 'Core Portal', icon: Settings, href: '/dashboard/core', color: 'text-orange-600' },
  { name: 'Manager Portal', icon: LayoutDashboard, href: '/dashboard/manager', color: 'text-indigo-600' },
];

const CORE_EMAILS = [
  'pooja@themavericksindia.com',
  'chetan@themavericksindia.com',
  'tech@themavericksindia.com',
  'mitali.p@themavericksindia.com',
  'archana@themavericksindia.com',
  'smriti@themavericksindia.com',
  'gaurav@themavericksindia.com',
  'avinash@themavericksindia.com',
  'satyam.singh@themavericksindia.com',
  'arunkumar@themavericksindia.com',
  'divyanshsharma@themavericksindia.com',
  'developerteam@themavericksindia.com'
];

const MANAGER_EMAILS = [
  'aashna@themavericksindia.com',
  'mahek@themavericksindia.com',
  'srishtee@themavericksindia.com',
  'vibhuti@themavericksindia.com',
  'akshay@themavericksindia.com',
  'manaswi@themavericksindia.com',
  'muskaan@themavericksindia.com',
  'indrajit@themavericksindia.com',
  'pavithra@themavericksindia.com',
  'shrestha@themavericksindia.com',
  'ila@themavericksindia.com',
  'samrat@themavericksindia.com',
  'anil@themavericksindia.com',
  'viviqa@themavericksindia.com',
  'ananya@themavericksindia.com',
  'kavita@themavericksindia.com'
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState('team');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const toggleDarkMode = () => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
      } else {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      }
    }
  };

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const { data: { user } } = await supabase.auth.getUser();
        let role = 'team';

        if (user) {
          setCurrentUser(user);
        }

        const response = await apiFetch(`${apiUrl}/api/teams/me`);
        if (response.ok) {
          const data = await response.json();
          role = data.role || 'team';
        }

        // Hardcoded overrides (useful for new users or list updates)
        if (user?.email) {
          const email = user.email.toLowerCase();
          if (CORE_EMAILS.includes(email)) role = 'core';
          else if (MANAGER_EMAILS.includes(email) && role === 'team') role = 'manager';
        }

        setUserRole(role);
      } catch (err) {
        console.error('Failed to fetch role:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const filteredItems = menuItems.filter(item => {
    if (item.name === 'My Allocations') return true;
    if (item.name === 'Manager Portal' && (userRole === 'manager' || userRole === 'core')) return true;
    if (item.name === 'Core Portal' && userRole === 'core') return true;
    return false;
  });

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 transition-colors z-50">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
          <Calendar className="w-6 h-6 text-blue-600" />
          MavsTracker
        </h2>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : filteredItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.color}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
        {currentUser && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            {currentUser.user_metadata?.avatar_url ? (
              <img src={currentUser.user_metadata.avatar_url} alt="Profile" className="w-10 h-10 rounded-full border-2 border-orange-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-200">
                {(currentUser.user_metadata?.full_name || currentUser.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {currentUser.user_metadata?.full_name || currentUser.email.split('@')[0]}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentUser.email}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={toggleDarkMode}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
