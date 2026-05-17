'use client';

import { useState, useEffect } from 'react';
import { Users, Briefcase, ChevronRight, Loader2, Search, Target, Calendar, Trash2, Edit3, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ClientAdmin({ initialMonth }: { initialMonth: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'actuals' | 'projected'>('actuals');
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
    if (activeSubTab === 'actuals') fetchSummary();
    if (activeSubTab === 'projected') {
      fetchProjections();
      fetchClients();
    }
  }, [activeSubTab, selectedMonth]);

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
      {/* Sub-tab Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveSubTab('actuals')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'actuals' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Calendar className="w-4 h-4" />
          Monthly Actuals
        </button>
        <button 
          onClick={() => setActiveSubTab('projected')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'projected' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Target className="w-4 h-4" />
          Monthly Projected
        </button>
      </div>

      {activeSubTab === 'actuals' ? (
        <div className="space-y-6">
          {/* Month Selector for Actuals */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">View Actual Hours</h3>
              <p className="text-xs text-slate-500 font-medium">Select a month to see performance across all clients.</p>
            </div>
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
      ) : (
        <div className="space-y-10">
          {/* Projection Form */}
          <div className="bg-orange-600 rounded-[40px] p-10 text-white shadow-2xl shadow-orange-100 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  {editingId ? <Edit3 className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                </div>
                <h3 className="text-2xl font-bold">{editingId ? 'Edit Projection' : 'New Monthly Projection'}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-orange-100 uppercase tracking-[0.2em] ml-1">Select Client</label>
                  <select 
                    value={projClient}
                    onChange={(e) => setProjClient(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-3.5 text-sm focus:ring-4 focus:ring-white/10 outline-none transition-all font-bold backdrop-blur-md"
                  >
                    <option value="" className="text-slate-900">Choose a client...</option>
                    {allClients.map(c => <option key={c.id} value={c.name} className="text-slate-900">{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-orange-100 uppercase tracking-[0.2em] ml-1">Target Month</label>
                  <div className="flex bg-white/10 border border-white/20 rounded-2xl overflow-hidden backdrop-blur-md">
                    <select 
                      value={projMonth.split('-')[1]} 
                      onChange={(e) => setProjMonth(`${projMonth.split('-')[0]}-${e.target.value}`)}
                      className="pl-5 pr-2 py-3.5 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-white"
                    >
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                        <option key={m} value={m} className="text-slate-900">{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
                      ))}
                    </select>
                    <div className="w-[1px] bg-white/20 my-2" />
                    <select 
                      value={projMonth.split('-')[0]} 
                      onChange={(e) => setProjMonth(`${e.target.value}-${projMonth.split('-')[1]}`)}
                      className="pl-2 pr-5 py-3.5 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-orange-200"
                    >
                      {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                        <option key={y} value={y} className="text-slate-900">{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-orange-100 uppercase tracking-[0.2em] ml-1">Estimated Hours</label>
                  <div className="flex gap-3">
                    <input 
                      type="number"
                      value={projHours}
                      onChange={(e) => setProjHours(e.target.value)}
                      placeholder="e.g. 160"
                      className="flex-1 min-w-0 bg-white border-none rounded-2xl px-5 py-3.5 text-sm text-slate-900 font-black outline-none focus:ring-4 focus:ring-orange-400 transition-all shadow-lg shadow-orange-700/20"
                    />
                    <button 
                      onClick={() => {
                        if (!projClient || !projHours) {
                          alert('Please select a client and enter hours first!');
                          return;
                        }
                        handleAddProjection();
                      }}
                      disabled={savingProj}
                      className="shrink-0 bg-slate-900 text-white px-5 py-3.5 rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                    >
                      {savingProj ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                      <span className="text-sm font-bold">{editingId ? 'Update' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
          </div>

          {/* Projections List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-orange-600" />
                Active Projections
              </h4>
              <span className="text-[10px] font-bold text-slate-400">{projectionsList.length} total entries</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projLoading ? (
                <div className="col-span-full py-20 text-center"><Loader2 className="w-10 h-10 text-orange-600 animate-spin mx-auto" /></div>
              ) : projectionsList.length === 0 ? (
                <div className="col-span-full py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 text-center text-slate-400 italic">No projections set yet.</div>
              ) : projectionsList.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-900 flex items-center justify-center font-bold text-lg group-hover:bg-orange-600 group-hover:text-white transition-all duration-500">
                      {p.clients?.name[0]}
                    </div>
                    <button 
                      onClick={() => handleDeleteProjection(p.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h5 className="font-bold text-slate-900 text-lg mb-1">{p.clients?.name}</h5>
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                      <Calendar className="w-3 h-3" />
                      {new Date(p.month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </div>
                    {p.creator?.name && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                        <Users className="w-3 h-3" />
                        By {p.creator.name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Status</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-mono font-black text-slate-900">{p.actual_hours.toFixed(1)}</span>
                        <span className="text-xs font-bold text-slate-400">/ {p.target_hours}h</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-orange-600">
                        {Math.min(100, (p.actual_hours / p.target_hours) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-orange-600 transition-all duration-1000 ease-out rounded-full"
                      style={{ width: `${Math.min(100, (p.actual_hours / p.target_hours) * 100)}%` }}
                    />
                  </div>

                  <button 
                    onClick={() => startEdit(p)}
                    className="w-full py-2 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Projection
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
