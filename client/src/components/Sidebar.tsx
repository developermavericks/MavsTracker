'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, User, Settings, LogOut, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

const menuItems = [
  { name: 'Team Portal', icon: Users, href: '/dashboard/team', color: 'text-emerald-600' },
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

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const { data: { user } } = await supabase.auth.getUser();
        let role = 'team';

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
    if (item.name === 'Team Portal') return true;
    if (item.name === 'Manager Portal' && (userRole === 'manager' || userRole === 'core')) return true;
    if (item.name === 'Core Portal' && userRole === 'core') return true;
    return false;
  });

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-2 tracking-tight">
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
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.color}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
