'use client';

import { useState, useEffect } from 'react';
import { Clock, Calendar as CalendarIcon, Plus, Filter, Download } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import AllocationsTable from '@/components/AllocationsTable';
import AddEntryModal from '@/components/AddEntryModal';
import CalendarImport from '@/components/CalendarImport';
import ExcelUpload from '@/components/ExcelUpload';
import OverlapWarningModal from '@/components/OverlapWarningModal';
import { useAllocations } from '@/hooks/useAllocations';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

export default function TeamPortal() {
  const [activeTab, setActiveTab] = useState<'projected' | 'weekly'>('weekly');
  const [displayMode, setDisplayMode] = useState<'detailed' | 'summary'>('detailed');
  const [month, setMonth] = useState('2024-05');
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">Team Portal</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage your time allocations and actuals.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="2024-05">May 2024</option>
            <option value="2024-04">April 2024</option>
          </select>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          label="Total Hours" 
          value={data.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1)} 
          subtext="of 160h" 
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('weekly')}
              className={`pb-4 pt-2 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'weekly' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Weekly Actuals
            </button>
            <button 
              onClick={() => setActiveTab('projected')}
              className={`pb-4 pt-2 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'projected' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Monthly Projected
            </button>
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
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
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
            <AllocationsTable 
              data={data} 
              type={activeTab} 
              displayMode={displayMode} 
              onDelete={handleDelete}
              onEdit={(id) => {
                const item = data.find(d => d.id === id);
                if (item) handleEdit(item);
              }}
            />
          )}
        </div>
      </div>

      {activeTab === 'weekly' && user && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          <CalendarImport userId={user.id} month={month} onSuccess={refresh} />
          <ExcelUpload userId={user.id} month={month} type="weekly" onSuccess={refresh} />
        </div>
      )}

      {activeTab === 'projected' && user && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ExcelUpload userId={user.id} month={month} type="projected" onSuccess={refresh} />
        </div>
      )}

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
