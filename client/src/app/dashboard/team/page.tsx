'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Clock, Calendar as CalendarIcon, Plus, Filter, Download } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import AllocationsTable from '@/components/AllocationsTable';
import AddEntryModal from '@/components/AddEntryModal';
import CalendarImport from '@/components/CalendarImport';
import ExcelUpload from '@/components/ExcelUpload';
import OverlapWarningModal from '@/components/OverlapWarningModal';
import ClientTargetsCard from '@/components/ClientTargetsCard';
import { useAllocations } from '@/hooks/useAllocations';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

export default function TeamPortal() {
  const [activeTab, setActiveTab] = useState<'projected' | 'weekly'>('weekly');
  const [displayMode, setDisplayMode] = useState<'detailed' | 'summary'>('detailed');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [warning, setWarning] = useState<{ isOpen: boolean, overlaps: any[], isBlocking: boolean, retryData: any }>({
    isOpen: false,
    overlaps: [],
    isBlocking: false,
    retryData: null
  });
  const [user, setUser] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userRole, setUserRole] = useState('team');
  const [unlockedMonths, setUnlockedMonths] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user?.email) {
        fetchUserRole();
        fetchUnlockedMonths();
      }
    });
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/me`);
      if (response.ok) {
        const resData = await response.json();
        let role = resData.role || 'team';
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const email = user.email.toLowerCase();
          const CORE_EMAILS = [
            'archana@themavericksindia.com', 'arunkumar@themavericksindia.com', 'avinash@themavericksindia.com',
            'chetan@themavericksindia.com', 'developerteam@themavericksindia.com', 'divyanshsharma@themavericksindia.com',
            'gaurav@themavericksindia.com', 'mitali.p@themavericksindia.com', 'pooja@themavericksindia.com',
            'satyam.singh@themavericksindia.com', 'smriti@themavericksindia.com', 'tech@themavericksindia.com'
          ];
          const MANAGER_EMAILS = [
            'aashna@themavericksindia.com', 'akshay@themavericksindia.com', 'alisha@themavericksindia.com',
            'ananya@themavericksindia.com', 'anil@themavericksindia.com', 'chhavi.a@themavericksindia.com',
            'ila@themavericksindia.com', 'ishmeet@themavericksindia.com', 'kavita@themavericksindia.com',
            'mahek@themavericksindia.com', 'manaswi@themavericksindia.com', 'muskaan@themavericksindia.com',
            'pavithra@themavericksindia.com', 'rajvi@themavericksindia.com', 'samrat@themavericksindia.com',
            'shrestha@themavericksindia.com', 'srishtee@themavericksindia.com', 'vibhuti@themavericksindia.com'
          ];
          if (CORE_EMAILS.includes(email)) role = 'core';
          else if (MANAGER_EMAILS.includes(email) && role === 'team') role = 'manager';
        }
        setUserRole(role);
      }
    } catch (err) {
      console.error('Failed to fetch role:', err);
    }
  };

  const fetchUnlockedMonths = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months`);
      if (response.ok) {
        const monthsData = await response.json();
        setUnlockedMonths(monthsData.map((m: any) => m.month));
      }
    } catch (err) {
      console.error('Failed to fetch unlocked months:', err);
    }
  };

  useEffect(() => {
    if (userRole === 'core') {
      setIsLocked(false);
      return;
    }
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      setIsLocked(false);
      return;
    }
    
    if (unlockedMonths.includes(month)) {
      setIsLocked(false);
      return;
    }

    const [targetYear, targetMonth] = month.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const diffMonths = (currentYear * 12 + currentMonth) - (targetYear * 12 + targetMonth);

    if (diffMonths <= 0) {
      setIsLocked(false);
    } else if (diffMonths === 1) {
      setIsLocked(currentDay >= 5);
    } else {
      setIsLocked(true);
    }
  }, [month, userRole, unlockedMonths]);

  const { data, loading: isTableLoading, refresh } = useAllocations(user?.id, month, activeTab);

  const handleForceSave = async () => {
    setIsActionLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/weekly`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: user?.id,
          month,
          ...warning.retryData,
          hours: parseFloat(warning.retryData.hours),
          force: true
        })
      });
      if (response.ok) {
        refresh();
        setWarning({ ...warning, isOpen: false });
        setIsModalOpen(false);
      } else {
        const result = await response.json();
        alert(result.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditData(item);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/${id}?kind=${activeTab}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        refresh();
      } else {
        const result = await response.json();
        alert(result.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownload = async () => {
    if (!user) return;
    try {
      const response = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/allocations/my/export?userId=${user.id}&month=${month}&kind=${activeTab}`
      );
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Allocations_${month}_${activeTab}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">My Allocations</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage your time allocations and actuals.</p>
        </div>
      </div>

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 text-amber-800 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-base">Monthly Submissions Locked</h4>
            <p className="text-sm text-amber-700 mt-1">
              Time logging for previous months gets locked automatically on the 5th date of the current month. Editing, deleting, and importing data are currently disabled.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          label="Total Hours" 
          value={data.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1)} 
          subtext={
            <span className="text-slate-600 font-semibold">
              of 160h (<strong className="font-extrabold text-blue-600 text-sm">{((data.reduce((acc, curr) => acc + curr.hours, 0) / 160) * 100).toFixed(1)}%</strong>)
            </span>
          } 
          icon={Clock} 
          color="bg-blue-600" 
        />
        <StatsCard 
          label="Entries" 
          value={data.length} 
          subtext="items" 
          icon={CalendarIcon} 
          color="bg-emerald-600" 
        />
        <StatsCard 
          label="Efficiency" 
          value="80.3%" 
          subtext="vs projected" 
          icon={Filter} 
          color="bg-indigo-600" 
        />
      </div>

      <div className="flex justify-end gap-3 relative z-[100]">
        <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
          <select 
            value={month.split('-')[1]} 
            onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
            className="pl-4 pr-2 py-2 text-sm font-bold bg-white border-none focus:ring-0 outline-none cursor-pointer text-slate-900 min-w-[120px] rounded-l-xl"
          >
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
              <option key={m} value={m} className="bg-white text-slate-900">{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <div className="w-[1px] bg-slate-100 my-2" />
          <select 
            value={month.split('-')[0]} 
            onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
            className="pl-2 pr-4 py-2 text-sm font-bold bg-white border-none focus:ring-0 outline-none cursor-pointer text-blue-600 min-w-[90px] rounded-r-xl"
          >
            {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
              <option key={y} value={y} className="bg-white text-slate-900">{y}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          disabled={isLocked}
          className="bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="w-full space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
              <div className="flex gap-6">
                <div className="pb-4 pt-2 text-sm font-bold border-b-2 border-blue-600 text-blue-600">
                  Monthly Actuals
                </div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setDisplayMode('detailed')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${displayMode === 'detailed' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Detailed
                  </button>
                  <button 
                    onClick={() => setDisplayMode('summary')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${displayMode === 'summary' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Summary
                  </button>
                </div>
                <button 
                  onClick={handleDownload}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-0">
              {isTableLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  <AllocationsTable 
                    data={data} 
                    type={activeTab} 
                    displayMode={displayMode} 
                    onDelete={handleDelete}
                    onEdit={(id) => {
                      const item = data.find(d => d.id === id);
                      if (item) handleEdit(item);
                    }}
                    isLocked={isLocked}
                  />
                </div>
              )}
            </div>
          </div>

          {activeTab === 'weekly' && user && !isLocked && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <CalendarImport userId={user.id} month={month} onSuccess={refresh} />
              <ExcelUpload userId={user.id} month={month} type="weekly" onSuccess={refresh} />
            </div>
          )}
        </div>
      </div>

      <AddEntryModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setIsEditMode(false);
          setEditData(null);
        }} 
        type={activeTab} 
        month={month} 
        userId={user?.id}
        onSuccess={refresh}
        onOverlap={(overlaps, isBlocking, retryData) => {
          setWarning({ isOpen: true, overlaps, isBlocking, retryData });
        }}
        isEdit={isEditMode}
        initialData={editData}
      />

      <OverlapWarningModal 
        isOpen={warning.isOpen}
        onClose={() => setWarning({ ...warning, isOpen: false })}
        onForceSave={handleForceSave}
        overlaps={warning.overlaps}
        isBlocking={warning.isBlocking}
      />
    </div>
  );
}
