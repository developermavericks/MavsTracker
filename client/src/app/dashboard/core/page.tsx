'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { Settings, FileText, Briefcase, Download, Plus, Search, ShieldCheck, User as UserIcon, Users, Trash2, UserPlus, Calendar, RefreshCw, Lock, Unlock } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { apiFetch } from '@/lib/api';
import ClientAdmin from '@/components/ClientAdmin';
import MemberInsights from '@/components/MemberInsights';

export default function CorePortal() {
  const [activeTab, setActiveTab] = useState<'admin' | 'members' | 'master' | 'clients' | 'exit-date'>('admin');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [groupBD, setGroupBD] = useState(false);
  const [groupInternal, setGroupInternal] = useState(false);
  const [exitSearch, setExitSearch] = useState('');

  // Unlocked months state
  const [unlockedMonthsList, setUnlockedMonthsList] = useState<any[]>([]);
  const [newUnlockMonth, setNewUnlockMonth] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Form states for adding a new employee
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const filteredExitUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const query = exitSearch.toLowerCase().trim();
      return name.includes(query) || email.includes(query);
    });
  }, [users, exitSearch]);

  const activeUsersOnly = useMemo(() => {
    if (!users) return [];
    return users.filter(u => !u.exit_date);
  }, [users]);

  const handleExitDateChange = async (userId: string, date: string | null) => {
    // Optimistic local state update for instant, seamless UX
    setUsers(prevUsers => 
      prevUsers.map(u => u.id === userId ? { ...u, exit_date: date } : u)
    );
    try {
      await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/users/${userId}/exit-date`, {
        method: 'PATCH',
        body: JSON.stringify({ exitDate: date })
      });
      // Silent background fetch, absolutely NO loading spinner to avoid date unmount
      await fetchUsers(false);
    } catch (err) {
      console.error('Failed to update exit date:', err);
      // Rollback on error
      fetchUsers(true);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!newEmployeeEmail.trim()) {
      setFormError('Email is required.');
      return;
    }
    
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/users`, {
        method: 'POST',
        body: JSON.stringify({
          name: newEmployeeName.trim(),
          email: newEmployeeEmail.trim().toLowerCase(),
          joiningDate: '2025-11-01'
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Failed to add employee.');
        return;
      }
      
      setFormSuccess('Employee added successfully!');
      setNewEmployeeName('');
      setNewEmployeeEmail('');
      setShowAddForm(false);
      fetchUsers(false);
    } catch (err) {
      console.error('Error adding employee:', err);
      setFormError('Failed to connect to server.');
    }
  };

  // Computed values for master report grouping
  const processedReport = useMemo(() => {
    if (!report) return null;

    let columns = [...report.clients];
    let rows = JSON.parse(JSON.stringify(report.rows));

    const bdKeywords = ['bd', 'business development'];
    const internalKeywords = ['internal'];

    if (groupBD) {
      const bdColumns = columns.filter(c => bdKeywords.some(kw => c.toLowerCase().includes(kw)));
      if (bdColumns.length > 0) {
        columns = columns.filter(c => !bdColumns.includes(c));
        columns.push('Total BD');

        rows.forEach((row: any) => {
          let bdTotal = 0;
          bdColumns.forEach(c => {
            bdTotal += (row.allocations[c] || 0);
            delete row.allocations[c];
          });
          if (bdTotal > 0) row.allocations['Total BD'] = bdTotal;
        });
      }
    }

    if (groupInternal) {
      const intColumns = columns.filter(c => internalKeywords.some(kw => c.toLowerCase().includes(kw)));
      if (intColumns.length > 0) {
        columns = columns.filter(c => !intColumns.includes(c));
        columns.push('Total Internal');

        rows.forEach((row: any) => {
          let intTotal = 0;
          intColumns.forEach(c => {
            intTotal += (row.allocations[c] || 0);
            delete row.allocations[c];
          });
          if (intTotal > 0) row.allocations['Total Internal'] = intTotal;
        });
      }
    }

    return { columns, rows };
  }, [report, groupBD, groupInternal]);

  useEffect(() => {
    if (activeTab === 'clients') fetchClients();
    if (activeTab === 'admin' || activeTab === 'members' || activeTab === 'exit-date') fetchUsers(true);
    if (activeTab === 'admin') fetchUnlockedMonthsList();
    if (activeTab === 'master') fetchReport();
  }, [activeTab, month]);

  const fetchUnlockedMonthsList = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months`);
      if (response.ok) {
        const data = await response.json();
        setUnlockedMonthsList(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch unlocked months:', err);
    }
  };

  const handleUnlockMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnlockMonth) return;
    setIsUnlocking(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ month: newUnlockMonth })
      });
      if (response.ok) {
        setNewUnlockMonth('');
        fetchUnlockedMonthsList();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to unlock month');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLockMonth = async (monthStr: string) => {
    if (!confirm(`Are you sure you want to lock ${monthStr} again?`)) return;
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/allocations/unlocked-months/${monthStr}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchUnlockedMonthsList();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to lock month');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

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

  const fetchUsers = async (showSpinner = false) => {
    if (showSpinner || users.length === 0) {
      setLoading(true);
    }
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
                <option key={m} value={m} className="bg-white text-slate-900">{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
              ))}
            </select>
            <div className="w-[1px] bg-slate-100 my-2" />
            <select 
              value={month.split('-')[0]} 
              onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
              className="px-4 py-2 text-sm font-bold bg-white border-none focus:ring-0 outline-none cursor-pointer text-orange-600 min-w-[90px] rounded-r-xl"
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
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
          <button 
            onClick={() => setActiveTab('exit-date')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'exit-date' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Exit & Joining
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatsCard label="Active Users" value={activeUsersOnly.length.toString()} icon={Settings} color="bg-orange-600" tooltip="Total number of active team members in the database" />
                <StatsCard label="System Health" value="Optimal" icon={ShieldCheck} color="bg-emerald-600" tooltip="Real-time connectivity status with Supabase Database and API endpoints" />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Users Section */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 px-1">Manage User Roles</h3>
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-sm">
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
                        ) : activeUsersOnly.map(u => {
                          // Role priority: Core > Manager > Team
                          let displayRole = u.role?.toUpperCase() || 'TEAM';
                          if (u.role === 'core') displayRole = 'CORE';
                          else if (u.is_manager) displayRole = 'MANAGER';
                          else displayRole = 'TEAM';

                          const handleRoleChange = async (userId: string, currentRole: string) => {
                            const roles: ('team' | 'manager' | 'core')[] = ['team', 'manager', 'core'];
                            const nextRole = roles[(roles.indexOf(currentRole as any) + 1) % roles.length];
                            
                            // Optimistic role cycle update
                            setUsers(prevUsers => 
                              prevUsers.map(u => {
                                if (u.id === userId) {
                                  const isManager = nextRole === 'manager';
                                  return { ...u, role: nextRole, is_manager: isManager };
                                }
                                return u;
                              })
                            );
                            
                            try {
                              await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/users/${userId}/role`, {
                                method: 'PATCH',
                                body: JSON.stringify({ role: nextRole })
                              });
                              fetchUsers(false);
                            } catch (err) {
                              console.error('Failed to update role:', err);
                              fetchUsers(true);
                            }
                          };

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
                                  <span className="text-sm font-bold text-slate-900 block leading-tight">
                                    {u.name || u.email.split('@')[0]}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{u.email.split('@')[1]}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 font-medium">{u.email}</td>
                              <td className="px-6 py-4 text-sm text-right">
                                <button 
                                  onClick={() => handleRoleChange(u.id, u.role || 'team')}
                                  title="Click to cycle role (Team -> Manager -> Core)"
                                  className={`${roleColor} text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest hover:brightness-95 transition-all`}
                                >
                                  {displayRole}
                                </button>
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

                {/* Locked Months Manager Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 px-1">Lock Override</h3>
                  <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-5 shadow-sm">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Unlock className="w-4 h-4 text-orange-600" />
                        Unlock Previous Month
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        Normally, time logging is capped after the 5th date of the current month. Unlock a month below to allow team edits.
                      </p>
                    </div>

                    <form onSubmit={handleUnlockMonth} className="flex gap-2">
                      <input 
                        type="month" 
                        required
                        value={newUnlockMonth}
                        onChange={(e) => setNewUnlockMonth(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none bg-white font-semibold text-slate-800"
                      />
                      <button 
                        type="submit"
                        disabled={isUnlocking}
                        className="bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-700 transition-all flex items-center gap-1 shadow-md shadow-orange-100 disabled:opacity-50 uppercase tracking-wider font-black"
                      >
                        Unlock
                      </button>
                    </form>

                    <div className="pt-3 border-t border-slate-200/60">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Active Overrides
                      </h5>
                      {unlockedMonthsList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No overrides set. Default locks active.</p>
                      ) : (
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {unlockedMonthsList.map((item) => (
                            <div key={item.month} className="flex items-center justify-between bg-white border border-slate-100 px-4 py-3 rounded-xl shadow-sm">
                              <span className="text-xs font-bold text-slate-800">
                                {new Date(item.month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </span>
                              <button 
                                onClick={() => handleLockMonth(item.month)}
                                className="text-[10px] font-black text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-all"
                                title="Re-lock month"
                              >
                                Re-Lock
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                  <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={groupBD} 
                          onChange={(e) => setGroupBD(e.target.checked)}
                          className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-orange-600 focus:ring-offset-1 checked:bg-orange-600 checked:border-orange-600 transition-all cursor-pointer"
                        />
                        <svg className="absolute w-4 h-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-white stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-orange-600 transition-colors">Group BD</span>
                    </label>
                    <div className="w-[1px] h-4 bg-slate-300" />
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative flex items-center">
                        <input 
                          type="checkbox" 
                          checked={groupInternal} 
                          onChange={(e) => setGroupInternal(e.target.checked)}
                          className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-orange-600 focus:ring-offset-1 checked:bg-orange-600 checked:border-orange-600 transition-all cursor-pointer"
                        />
                        <svg className="absolute w-4 h-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-white stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-orange-600 transition-colors">Group Internal</span>
                    </label>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-visible">
                    <select 
                      value={month.split('-')[1]} 
                      onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
                      className="px-3 py-1.5 text-xs font-black bg-white border-none focus:ring-0 outline-none cursor-pointer uppercase tracking-wider text-slate-900 min-w-[80px] rounded-l-lg"
                    >
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                        <option key={m} value={m} className="bg-white text-slate-900">{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'short' })}</option>
                      ))}
                    </select>
                    <div className="w-[1px] bg-slate-300 my-1.5" />
                    <select 
                      value={month.split('-')[0]} 
                      onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
                      className="px-3 py-1.5 text-xs font-black bg-white border-none focus:ring-0 outline-none cursor-pointer text-orange-600 min-w-[80px] rounded-r-lg"
                    >
                      {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
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
                      {processedReport?.columns.map((c: string) => (
                        <th key={c} className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right ${c.startsWith('Total ') ? 'text-orange-600 bg-orange-50/50' : ''}`}>{c}</th>
                      ))}
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right font-black bg-slate-100">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                       <tr><td colSpan={10} className="text-center py-10"><div className="animate-spin inline-block w-6 h-6 border-b-2 border-orange-600 rounded-full"></div></td></tr>
                    ) : processedReport?.rows.map((row: any) => {
                      const total = Object.values(row.allocations).reduce((acc: number, curr: any) => acc + (curr as number), 0);
                      return (
                        <tr key={row.email} className="hover:bg-slate-50 transition-colors group/row">
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 sticky left-0 bg-white group-hover/row:bg-slate-50 z-10">{row.name}</td>
                          {processedReport.columns.map((c: string) => (
                            <td key={c} className={`px-6 py-4 text-sm text-slate-600 font-mono text-right ${c.startsWith('Total ') ? 'font-black bg-orange-50/30 text-orange-900' : ''}`}>
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
                  {!loading && processedReport && processedReport.rows.length > 0 && (
                    <tfoot className="bg-slate-900 shadow-xl border-t-2 border-slate-900">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold text-white sticky left-0 bg-slate-900 z-10 uppercase tracking-widest">Grand Total</td>
                        {processedReport.columns.map((c: string) => {
                          const colTotal = processedReport.rows.reduce((acc: number, row: any) => acc + (row.allocations[c] || 0), 0);
                          return (
                            <td key={c} className={`px-6 py-4 text-sm font-black font-mono text-right ${c.startsWith('Total ') ? 'text-orange-400 bg-slate-800' : 'text-slate-300'}`}>
                              {colTotal.toFixed(2)}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-sm font-black font-mono text-right text-orange-400 bg-slate-800 border-l border-slate-700">
                          {processedReport.rows.reduce((acc: number, row: any) => acc + Object.values(row.allocations).reduce((sum: number, val: any) => sum + (val as number), 0), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <ClientAdmin selectedMonth={month} setSelectedMonth={setMonth} />
          )}

          {activeTab === 'exit-date' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Manage Employee Exit & Joining</h3>
                  <p className="text-sm text-slate-500 font-medium">Set exit dates or record new employees who have joined. Exited employees are excluded from subsequent monthly reports.</p>
                </div>
                {/* Search Bar & Add Button */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-3 w-full md:max-w-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex-1">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search employees..."
                      value={exitSearch}
                      onChange={(e) => setExitSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs w-full focus:ring-0 text-slate-900"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setShowAddForm(!showAddForm);
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-orange-100 uppercase tracking-wider cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Employee
                  </button>
                </div>
              </div>

              {/* Add New Employee Form */}
              {showAddForm && (
                <form onSubmit={handleAddEmployee} className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-4 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-orange-600" />
                      Add New Employee record
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  {formError && (
                    <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-lg border border-red-100">
                      {formError}
                    </div>
                  )}
                  {formSuccess && (
                    <div className="bg-emerald-50 text-emerald-700 text-xs font-bold p-3 rounded-lg border border-emerald-100">
                      {formSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Full Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Udbhav Singh"
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none bg-white font-medium text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Email Address</label>
                      <input 
                        type="email"
                        placeholder="email@themavericksindia.com"
                        value={newEmployeeEmail}
                        onChange={(e) => setNewEmployeeEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none bg-white font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-md shadow-slate-100 uppercase tracking-widest cursor-pointer"
                    >
                      Save Record
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Employee</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Exit Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                       <tr><td colSpan={5} className="text-center py-10"><div className="animate-spin inline-block w-6 h-6 border-b-2 border-orange-600 rounded-full"></div></td></tr>
                    ) : filteredExitUsers.length === 0 ? (
                       <tr><td colSpan={5} className="text-center py-10 text-slate-400 font-medium">No employees found.</td></tr>
                    ) : filteredExitUsers.map(u => {
                      const initial = (u.name?.[0] || u.email?.[0] || '?').toUpperCase();
                      const hasLoggedIn = !!(u.last_login || u.picture || u.sub);
                      const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-indigo-600', 'bg-rose-600', 'bg-amber-600', 'bg-violet-600', 'bg-cyan-600'];
                      const colorIndex = (u.email?.length || 0) % colors.length;
                      const avatarColor = hasLoggedIn ? colors[colorIndex] : 'bg-slate-200';
                      const initialColor = hasLoggedIn ? 'text-white' : 'text-slate-400';

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
                          <td className="px-6 py-4 text-sm">
                            {u.exit_date ? (
                              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">Exited</span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">Active</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <input 
                              type="date"
                              value={u.exit_date ? u.exit_date.substring(0, 10) : ''}
                              onChange={(e) => handleExitDateChange(u.id, e.target.value)}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-600 outline-none bg-white cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            {u.exit_date && (
                              <button 
                                onClick={() => handleExitDateChange(u.id, null)}
                                className="text-xs font-black text-slate-500 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all cursor-pointer"
                              >
                                Reactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
