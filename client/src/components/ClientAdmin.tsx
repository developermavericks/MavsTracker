'use client';

import { useState, useEffect } from 'react';
import { Users, Briefcase, ChevronRight, Loader2, Search, Filter } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ClientAdmin({ month }: { month: string }) {
  const [view, setView] = useState<'weekly' | 'projected'>('weekly');
  const [summary, setSummary] = useState<{ name: string, hours: number }[]>([]);
  const [roster, setRoster] = useState<{ name: string, email: string, hours: number }[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSummary();
  }, [month, view]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/clients-summary?month=${month}&view=${view}`);
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = async () => {
    if (!selectedClient) return;
    setRosterLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/client-roster?month=${month}&clientName=${selectedClient}&view=${view}`);
      const data = await response.json();
      setRoster(data);
    } catch (err) {
      console.error('Failed to fetch roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  const filteredSummary = summary.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalHours = summary.reduce((acc, curr) => acc + curr.hours, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-2xl">
            <Filter className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Report Settings</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl mt-1">
              <button 
                onClick={() => setView('weekly')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'weekly' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Weekly (Actuals)
              </button>
              <button 
                onClick={() => setView('projected')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'projected' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Monthly (Projected)
              </button>
            </div>
          </div>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-900">Client Summary</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Hours</span>
            <span className="text-xl font-mono font-black text-slate-900">{totalHours.toFixed(2)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Name</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-8 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
                    <p className="text-sm text-slate-500 mt-2">Loading client summaries...</p>
                  </td>
                </tr>
              ) : filteredSummary.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-8 py-12 text-center text-slate-400 italic">No data found for this period.</td>
                </tr>
              ) : (
                filteredSummary.map(item => (
                  <tr key={item.name} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs">
                          {item.name[0]}
                        </div>
                        <span className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className="text-sm font-mono font-bold text-slate-900">{item.hours.toFixed(2)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filteredSummary.length > 0 && (
               <tfoot className="bg-slate-900">
                 <tr>
                   <td className="px-8 py-4 text-sm font-bold text-white">Grand Total</td>
                   <td className="px-8 py-4 text-right text-sm font-mono font-black text-orange-400">{totalHours.toFixed(2)}</td>
                 </tr>
               </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Roster Section */}
      <div className="bg-slate-50 rounded-[40px] p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold text-slate-900">Client Roster</h3>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Select Client</label>
                <select 
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all shadow-sm font-bold"
                >
                  <option value="">Select a client to view staff...</option>
                  {summary.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <button 
                onClick={fetchRoster}
                disabled={!selectedClient || rosterLoading}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center gap-2 h-[48px]"
              >
                {rosterLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Roster'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {selectedClient && roster.length > 0 && (
            <div className="bg-white px-6 py-4 rounded-3xl border border-orange-100 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Client Total</span>
              <span className="text-2xl font-mono font-black text-orange-600">
                {roster.reduce((acc, curr) => acc + curr.hours, 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {selectedClient && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rosterLoading ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-16 text-center">
                        <Loader2 className="w-10 h-10 text-orange-600 animate-spin mx-auto" />
                        <p className="text-sm text-slate-500 mt-4 font-medium">Crunching data for {selectedClient}...</p>
                      </td>
                    </tr>
                  ) : roster.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-8 py-16 text-center text-slate-400 italic">Select a client and click "Load Roster" to see who worked on it.</td>
                    </tr>
                  ) : (
                    roster.map(emp => (
                      <tr key={emp.email} className="hover:bg-orange-50/30 transition-colors">
                        <td className="px-8 py-4">
                          <span className="text-sm font-bold text-slate-900">{emp.name}</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm text-slate-500">{emp.email}</span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <span className="text-sm font-mono font-bold text-orange-600">{emp.hours.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
