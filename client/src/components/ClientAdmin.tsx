'use client';

import { useState, useEffect } from 'react';
import { Users, Briefcase, ChevronRight, Loader2, Search, Target, Calendar, Trash2, Edit3, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import SearchableSelect from '@/components/SearchableSelect';

export default function ClientAdmin({ initialMonth }: { initialMonth: string }) {
  // Projected tab state removed
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<{ name: string, hours: number }[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Roster Modal State
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [rosterData, setRosterData] = useState<{ name: string, email: string, hours: number }[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [focusedClient, setFocusedClient] = useState('');

  // Projections State
  const [allClients, setAllClients] = useState<any[]>([]);
  const [projClient, setProjClient] = useState('');
  const [projMonth, setProjMonth] = useState(selectedMonth);
  const [projHours, setProjHours] = useState('');
  const [projectionsList, setProjectionsList] = useState<any[]>([]);
  const [savingProj, setSavingProj] = useState(false);
  const [projLoading, setProjLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/clients-summary?month=${selectedMonth}&view=weekly`);
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`);
      const data = await res.json();
      setAllClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchProjections = async () => {
    setProjLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/projections`);
      const data = await response.json();
      setProjectionsList(data);
    } catch (err) {
      console.error('Failed to fetch projections:', err);
    } finally {
      setProjLoading(false);
    }
  };

  const openRoster = async (clientName: string) => {
    setFocusedClient(clientName);
    setIsRosterOpen(true);
    setRosterLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/client-roster?month=${selectedMonth}&clientName=${clientName}&view=weekly`);
      const data = await response.json();
      setRosterData(data);
    } catch (err) {
      console.error('Failed to fetch roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  const handleAddProjection = async () => {
    if (!projClient || !projMonth || !projHours) return;
    setSavingProj(true);
    try {
      const clientObj = allClients.find(c => c.name === projClient);
      if (!clientObj) throw new Error('Client not found');

      await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/projections`, {
        method: 'POST',
        body: JSON.stringify({
          id: editingId, // Pass ID if editing
          client_id: clientObj.id,
          month: projMonth,
          target_hours: parseFloat(projHours)
        })
      });
      
      setProjHours('');
      setEditingId(null);
      fetchProjections();
    } catch (err: any) {
      console.error('Projection Save Error:', err);
      alert('Error saving projection: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingProj(false);
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setProjClient(p.clients.name);
    setProjMonth(p.month);
    setProjHours(p.target_hours.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProjection = async (id: string) => {
    if (!confirm('Delete this projection?')) return;
    try {
      await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/projections/${id}`, { method: 'DELETE' });
      fetchProjections();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const totalActualHours = summary.reduce((acc, curr) => acc + curr.hours, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-6">
        {/* Month Selector for Actuals */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">View Actual Hours</h3>
            <p className="text-xs text-slate-500 font-medium">Select a month to see performance across all clients.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SearchableSelect 
              options={[...summary].sort((a, b) => a.name.localeCompare(b.name)).map(item => ({ value: item.name, label: item.name }))}
              value=""
              onChange={(val) => {
                if (val) openRoster(val);
              }}
              placeholder="Search Client..."
              className="w-48"
            />
            <div className="flex bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
               <select 
                 value={selectedMonth.split('-')[1]} 
                 onChange={(e) => setSelectedMonth(`${selectedMonth.split('-')[0]}-${e.target.value}`)}
                 className="pl-4 pr-2 py-2.5 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
               >
                 {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                   <option key={m} value={m}>{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
                 ))}
               </select>
               <div className="w-[1px] bg-slate-200 my-2" />
               <select 
                 value={selectedMonth.split('-')[0]} 
                 onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonth.split('-')[1]}`)}
                 className="pl-2 pr-4 py-2.5 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-orange-600"
               >
                 {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                   <option key={y} value={y}>{y}</option>
                 ))}
               </select>
            </div>
          </div>
        </div>

        {/* Client List (Actuals) */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Total Hours</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <Loader2 className="w-10 h-10 text-orange-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center text-slate-400 italic">No data found for {selectedMonth}.</td>
                </tr>
              ) : (
                summary.map(item => (
                  <tr 
                    key={item.name} 
                    onClick={() => openRoster(item.name)}
                    className="group hover:bg-slate-50/80 transition-all cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                          {item.name[0]}
                        </div>
                        <span className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-sm font-mono font-black text-slate-900">{item.hours.toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-100 group-hover:text-orange-600 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && summary.length > 0 && (
               <tfoot className="bg-slate-900">
                 <tr>
                   <td className="px-8 py-5 text-sm font-bold text-white">Grand Total Hours</td>
                   <td className="px-8 py-5 text-right text-sm font-mono font-black text-orange-400">{totalActualHours.toFixed(2)}</td>
                   <td></td>
                 </tr>
               </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Roster Modal */}
      {isRosterOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setIsRosterOpen(false)}
          />
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center font-bold text-xl">
                  {focusedClient[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{focusedClient}</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Employee Roster • {selectedMonth}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRosterOpen(false)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-0">
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rosterLoading ? (
                      <tr>
                        <td colSpan={2} className="px-10 py-20 text-center">
                          <Loader2 className="w-10 h-10 text-orange-600 animate-spin mx-auto" />
                          <p className="text-sm text-slate-500 mt-4 font-medium tracking-tight">Gathering data for {focusedClient}...</p>
                        </td>
                      </tr>
                    ) : rosterData.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-10 py-20 text-center text-slate-400 italic">No employees worked on this client in {selectedMonth}.</td>
                      </tr>
                    ) : (
                      rosterData.map(emp => (
                        <tr key={emp.email} className="hover:bg-slate-50 transition-colors">
                          <td className="px-10 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{emp.name}</span>
                              <span className="text-xs text-slate-400 font-medium">{emp.email}</span>
                            </div>
                          </td>
                          <td className="px-10 py-5 text-right">
                            <span className="text-sm font-mono font-black text-orange-600">{emp.hours.toFixed(2)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {!rosterLoading && rosterData.length > 0 && (
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td className="px-10 py-5 text-sm font-bold text-slate-900 tracking-tight uppercase">Total Client Hours</td>
                        <td className="px-10 py-5 text-right text-sm font-mono font-black text-slate-900">
                          {rosterData.reduce((acc, curr) => acc + curr.hours, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setIsRosterOpen(false)}
                className="bg-slate-900 text-white px-10 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Done Viewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Plus = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
