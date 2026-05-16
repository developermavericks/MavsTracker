'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Settings, FileText, Briefcase, Download, Plus, Search, ShieldCheck, User as UserIcon, Users, Trash2 } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { apiFetch } from '@/lib/api';
import ClientAdmin from '@/components/ClientAdmin';
import MemberInsights from '@/components/MemberInsights';

export default function CorePortal() {
  const [activeTab, setActiveTab] = useState<'admin' | 'members' | 'master' | 'clients'>('admin');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'clients') fetchClients();
    if (activeTab === 'admin' || activeTab === 'members') fetchUsers();
    if (activeTab === 'master') fetchReport();
  }, [activeTab, month]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`);
      const data = await response.json();
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/all`);
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/master?month=${month}`);
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/reports/export?month=${month}&token=${session?.access_token}`;
    window.open(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Core Portal</h1>
          <p className="text-slate-500 mt-1">Administrative tools and master reporting for core staff.</p>
        </div>
        <div className="flex items-center gap-4 relative z-[100]">
          <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
            <select 
              value={month.split('-')[1]} 
              onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
              className="px-4 py-2 text-sm font-bold bg-white border-none focus:ring-0 outline-none cursor-pointer text-slate-900 min-w-[120px] rounded-l-xl"
            >
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                <option key={m} value={m} className="bg-white text-slate-900">{new Date(2024, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
              ))}
            </select>
            <div className="w-[1px] bg-slate-100 my-2" />
            <select 
              value={month.split('-')[0]} 
              onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
              className="px-4 py-2 text-sm font-bold bg-white border-none focus:ring-0 outline-none cursor-pointer text-orange-600 min-w-[90px] rounded-r-xl"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="bg-white text-slate-900">{y}</option>
              ))}
            </select>
          </div>
          <div className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl hidden md:flex items-center gap-2 text-sm font-bold border border-orange-200">
            <ShieldCheck className="w-4 h-4" />
            Admin Access
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-2 flex items-center bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('admin')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'admin' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Admin Config
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'members' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Members
          </button>
          <button 
            onClick={() => setActiveTab('clients')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'clients' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Clients (Admin)
          </button>
          <button 
            onClick={() => setActiveTab('master')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'master' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Master Report
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatsCard label="Active Users" value={users.length.toString()} icon={Settings} color="bg-orange-600" />
                <StatsCard label="System Health" value="Optimal" icon={ShieldCheck} color="bg-emerald-600" />
              </div>
              
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">User</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                       <tr><td colSpan={4} className="text-center py-10"><div className="animate-spin inline-block w-6 h-6 border-b-2 border-orange-600 rounded-full"></div></td></tr>
                    ) : users.map(u => {
                      // Role priority: Core > Manager > Team
                      let displayRole = u.role?.toUpperCase() || 'TEAM';
                      if (u.role === 'core') displayRole = 'CORE';
                      else if (u.is_manager) displayRole = 'MANAGER';
                      else displayRole = 'TEAM';

                      const roleColor = 
                        displayRole === 'CORE' ? 'bg-orange-100 text-orange-700' :
                        displayRole === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-slate-100 text-slate-600';

                      // Avatar Color Logic: Only bright colors for logged-in users
                      const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-indigo-600', 'bg-rose-600', 'bg-amber-600', 'bg-violet-600', 'bg-cyan-600'];
                      const colorIndex = (u.email?.length || 0) % colors.length;
                      const hasLoggedIn = !!(u.last_login || u.picture || u.sub);
                      const avatarColor = hasLoggedIn ? colors[colorIndex] : 'bg-slate-200';
                      const initialColor = hasLoggedIn ? 'text-white' : 'text-slate-400';
                      const initial = (u.name?.[0] || u.email?.[0] || '?').toUpperCase();

                      return (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            {u.picture ? (
                              <img src={u.picture} className="w-9 h-9 rounded-xl object-cover shadow-sm ring-2 ring-white" />
                            ) : (
                              <div className={`w-9 h-9 ${avatarColor} rounded-xl flex items-center justify-center ${initialColor} text-sm font-black shadow-sm ring-2 ring-white`}>
                                {initial}
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-bold text-slate-900 block leading-tight">{u.name || u.email.split('@')[0]}</span>
                              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{u.email.split('@')[1]}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">{u.email}</td>
                          <td className="px-6 py-4 text-sm text-right">
                            <span className={`${roleColor} text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest`}>
                              {displayRole}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={async () => {
                                if (confirm(`Remove ${u.email}? This will revoke their access immediately.`)) {
                                  await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/users/${u.id}`, { method: 'DELETE' });
                                  fetchUsers();
                                }
                              }}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <MemberInsights month={month} />
          )}

          {activeTab === 'master' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Monthly Master Allocation Pivot</h3>
                  <p className="text-sm text-slate-500 font-medium">Viewing data for {new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 relative z-[100]">
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-visible">
                    <select 
                      value={month.split('-')[1]} 
                      onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
                      className="px-3 py-1.5 text-xs font-black bg-white border-none focus:ring-0 outline-none cursor-pointer uppercase tracking-wider text-slate-900 min-w-[80px] rounded-l-lg"
                    >
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                        <option key={m} value={m} className="bg-white text-slate-900">{new Date(2024, parseInt(m)-1).toLocaleString('en-US', { month: 'short' })}</option>
                      ))}
                    </select>
                    <div className="w-[1px] bg-slate-300 my-1.5" />
                    <select 
                      value={month.split('-')[0]} 
                      onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
                      className="px-3 py-1.5 text-xs font-black bg-white border-none focus:ring-0 outline-none cursor-pointer text-orange-600 min-w-[80px] rounded-r-lg"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y} className="bg-white text-slate-900">{y}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={handleExport}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200 uppercase tracking-widest"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10">Member</th>
                      {report?.clients.map((c: string) => (
                        <th key={c} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">{c}</th>
                      ))}
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right font-black bg-slate-100">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                       <tr><td colSpan={10} className="text-center py-10"><div className="animate-spin inline-block w-6 h-6 border-b-2 border-orange-600 rounded-full"></div></td></tr>
                    ) : report?.rows.map((row: any) => {
                      const total = Object.values(row.allocations).reduce((acc: number, curr: any) => acc + (curr as number), 0);
                      return (
                        <tr key={row.email} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{row.name}</td>
                          {report.clients.map((c: string) => (
                            <td key={c} className="px-6 py-4 text-sm text-slate-600 font-mono text-right">
                              {(row.allocations[c] || 0).toFixed(2)}
                            </td>
                          ))}
                          <td className="px-6 py-4 text-sm font-black text-slate-900 font-mono text-right bg-slate-50">
                            {total.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <ClientAdmin initialMonth={month} />
          )}
        </div>
      </div>
    </div>
  );
}
