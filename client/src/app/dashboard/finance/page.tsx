'use client';
// Trigger Vercel frontend rebuild
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { IndianRupee, Download, Users, Briefcase, RefreshCw, Layers, Sliders, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { apiFetch } from '@/lib/api';

export default function FinancePortal() {
  const [activeWorkspace, setActiveWorkspace] = useState<'pivot' | 'manager'>('pivot');
  const [currentViewMode, setCurrentViewMode] = useState<'hours' | 'percent' | 'salary'>('hours');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [groupBD, setGroupBD] = useState(true);
  const [groupLeave, setGroupLeave] = useState(true);
  const [groupInternal, setGroupInternal] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  // States for the Salary & Budget editor
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingSalaryVal, setEditingSalaryVal] = useState<string>('');
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingBudgetVal, setEditingBudgetVal] = useState<string>('');
  const [editingCoreVal, setEditingCoreVal] = useState<string>('');

  const [savingSalary, setSavingSalary] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  // Fetch report data on parameters change
  useEffect(() => {
    fetchReport();
  }, [month, groupBD, groupLeave, groupInternal]);

  // Fetch manager settings data when the tab changes
  useEffect(() => {
    if (activeWorkspace === 'manager') {
      fetchUsersAndClients();
    }
  }, [activeWorkspace]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await apiFetch(
        `${apiUrl}/api/finance/master?month=${month}&group_bd=${groupBD}&group_leave=${groupLeave}&group_internal=${groupInternal}`
      );
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (err) {
      console.error('Failed to fetch finance report:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersAndClients = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const [usersRes, clientsRes] = await Promise.all([
        apiFetch(`${apiUrl}/api/teams/all`),
        apiFetch(`${apiUrl}/api/clients`)
      ]);

      if (usersRes.ok && clientsRes.ok) {
        const usersData = await usersRes.json();
        const clientsData = await clientsRes.json();
        setUsers(usersData);
        setClients(clientsData);
      }
    } catch (err) {
      console.error('Failed to fetch configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      
      const exportUrl = `${apiUrl}/api/finance/export?month=${month}&group_bd=${groupBD}&group_leave=${groupLeave}&group_internal=${groupInternal}&view_type=${currentViewMode}&token=${token}`;
      window.open(exportUrl);
    } catch (err) {
      console.error('Failed to download Excel report:', err);
    }
  };

  const handleSaveSalary = async (userId: string) => {
    setSavingSalary(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await apiFetch(`${apiUrl}/api/finance/salary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, salary: Number(editingSalaryVal) || 0 })
      });
      if (response.ok) {
        setEditingUserId(null);
        fetchUsersAndClients();
        fetchReport();
      }
    } catch (err) {
      console.error('Failed to save user salary:', err);
    } finally {
      setSavingSalary(false);
    }
  };

  const handleSaveClientBudget = async (clientId: string) => {
    setSavingBudget(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await apiFetch(`${apiUrl}/api/finance/client-budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          budget: Number(editingBudgetVal) || 0,
          core: editingCoreVal.trim()
        })
      });
      if (response.ok) {
        setEditingClientId(null);
        fetchUsersAndClients();
        fetchReport();
      }
    } catch (err) {
      console.error('Failed to save client allocations configuration:', err);
    } finally {
      setSavingBudget(false);
    }
  };

  // Aggregators for stats cards
  const stats = useMemo(() => {
    if (!reportData) return { totalBudget: 0, payroll: 0, activeClients: 0 };
    const clientsSum = reportData.clients.reduce((acc: number, c: any) => acc + (Number(c.budget) || 0), 0);
    const usersSum = reportData.rows.reduce((acc: number, r: any) => acc + (Number(r.salary) || 0), 0);
    return {
      totalBudget: clientsSum,
      payroll: usersSum,
      activeClients: reportData.clients.length
    };
  }, [reportData]);

  // Headers grouping calculation for multi-level Core Header merging
  const coreHeaderGroups = useMemo(() => {
    if (!reportData || !reportData.clients.length) return [];
    const groups: { name: string; count: number }[] = [];
    let lastCore = reportData.clients[0].core || '(Unassigned)';
    let count = 1;

    for (let i = 1; i < reportData.clients.length; i++) {
      const currentCore = reportData.clients[i].core || '(Unassigned)';
      if (currentCore === lastCore) {
        count++;
      } else {
        groups.push({ name: lastCore, count });
        lastCore = currentCore;
        count = 1;
      }
    }
    groups.push({ name: lastCore, count });
    return groups;
  }, [reportData]);

  // Format currency helper
  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Upper Title Band */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
            <IndianRupee className="w-8 h-8 text-blue-600" />
            Finance Portal
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Analyze allocations, costs, payroll, and export clean reports.
          </p>
        </div>

        {/* Dedicated Split Month/Year Selector Pill */}
        <div className="flex items-center gap-4 relative z-50">
          <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
            <select
              value={month.split('-')[1]}
              onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
              className="px-4 py-2 text-sm font-bold bg-white border-none focus:ring-0 outline-none cursor-pointer text-slate-900 min-w-[120px] rounded-l-xl"
            >
              {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m) => (
                <option key={m} value={m} className="bg-white text-slate-900">
                  {new Date(2025, parseInt(m) - 1).toLocaleString('en-US', { month: 'long' })}
                </option>
              ))}
            </select>
            <div className="w-[1px] bg-slate-100 my-2" />
            <select
              value={month.split('-')[0]}
              onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
              className="px-4 py-2 text-sm font-bold bg-white border-none focus:ring-0 outline-none cursor-pointer text-blue-600 min-w-[90px] rounded-r-xl"
            >
              {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y} className="bg-white text-slate-900">
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          label="Total Monthly Payroll"
          value={fmtCurrency(stats.payroll)}
          icon={Users}
          color="bg-blue-600"
        />
        <StatsCard
          label="Aggregate Client Budget"
          value={fmtCurrency(stats.totalBudget)}
          icon={Briefcase}
          color="bg-emerald-600"
        />
        <StatsCard
          label="Target Accounts"
          value={stats.activeClients.toString()}
          icon={Layers}
          color="bg-indigo-600"
        />
      </div>

      {/* Workspace Tabs & View Filters Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Workspace Level Selector */}
        <div className="border-b border-slate-100 px-6 py-2 flex items-center bg-slate-50/50">
          <button
            onClick={() => setActiveWorkspace('pivot')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeWorkspace === 'pivot'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Financial Pivot Analyzer
          </button>
          <button
            onClick={() => setActiveWorkspace('manager')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeWorkspace === 'manager'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Salary & Budget Manager
          </button>
        </div>

        <div className="p-8">
          
          {/* TAB 1: FINANCIAL PIVOT ANALYZER */}
          {activeWorkspace === 'pivot' && (
            <div className="space-y-6">
              
              {/* Controls and Views Row */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                
                {/* 3 View Tabs */}
                <div className="flex bg-slate-200/60 p-1 rounded-xl">
                  {(['hours', 'percent', 'salary'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setCurrentViewMode(view)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                        currentViewMode === view
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {view === 'hours' ? 'Hours View' : view === 'percent' ? 'Percentage View' : 'Allocated Salary'}
                    </button>
                  ))}
                </div>

                {/* dynamic grouping checkboxes */}
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={groupBD}
                      onChange={(e) => setGroupBD(e.target.checked)}
                      className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-600 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Group BD</span>
                  </label>
                  <div className="w-[1px] h-4 bg-slate-300" />
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={groupLeave}
                      onChange={(e) => setGroupLeave(e.target.checked)}
                      className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-600 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Group LEAVE</span>
                  </label>
                  <div className="w-[1px] h-4 bg-slate-300" />
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={groupInternal}
                      onChange={(e) => setGroupInternal(e.target.checked)}
                      className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-600 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Group Internal</span>
                  </label>
                </div>

                {/* Right Side Buttons */}
                <div className="flex items-center gap-2 xl:ml-auto">
                  <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleExport}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-200 uppercase tracking-widest"
                  >
                    <Download className="w-4 h-4" />
                    Download Finance Excel
                  </button>
                </div>
              </div>

              {/* Main Financial Pivot Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[65vh] shadow-sm relative">
                <table className="w-full text-left border-collapse">
                  
                  {/* Sticky Header */}
                  <thead className="sticky top-0 bg-slate-50 z-30 shadow-[0_1px_0_rgba(229,231,235,1)]">
                    
                    {/* Header Row 1: Core Verticals */}
                    <tr className="border-b border-slate-200">
                      <th colSpan={3} className="px-6 py-3 text-xs font-bold text-slate-500 bg-slate-50 sticky left-0 z-40 border-r border-slate-200 text-center uppercase tracking-widest">
                        Metadata
                      </th>
                      {coreHeaderGroups.map((g, i) => (
                        <th
                          key={i}
                          colSpan={g.count}
                          className="px-6 py-3 text-xs font-bold text-center text-slate-700 bg-slate-100/80 border-r border-slate-200 uppercase tracking-widest font-black"
                        >
                          {g.name}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-xs font-bold text-center text-slate-950 bg-slate-100/90 uppercase tracking-widest font-black">
                        Total
                      </th>
                    </tr>

                    {/* Header Row 2: Client Names */}
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 bg-slate-50 sticky left-0 z-40">Member</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 bg-slate-50 sticky left-[140px] z-40">Email</th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 bg-slate-50 sticky left-[320px] z-40 border-r border-slate-200 text-right">Salary</th>
                      {reportData?.clients.map((c: any) => (
                        <th
                          key={c.name}
                          className="px-6 py-3 text-xs font-bold text-slate-600 text-right border-r border-slate-200 min-w-[120px]"
                        >
                          {c.name}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-xs font-bold text-slate-950 text-right font-black bg-slate-100/50">Total</th>
                    </tr>

                    {/* Header Row 3: Client Budgets */}
                    <tr className="border-b-2 border-slate-300 bg-emerald-50/50">
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 sticky left-0 z-40 bg-emerald-50"></th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 sticky left-[140px] z-40 bg-emerald-50"></th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-800 sticky left-[320px] z-40 bg-emerald-50 border-r border-slate-200 text-right">Budget</th>
                      {reportData?.clients.map((c: any) => (
                        <th
                          key={c.name}
                          className="px-6 py-3 text-xs font-black text-emerald-800 text-right border-r border-slate-200 bg-emerald-50/70"
                        >
                          {c.budget ? fmtCurrency(c.budget) : '-'}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-xs font-bold text-slate-50 bg-emerald-50"></th>
                    </tr>

                  </thead>

                  {/* Body */}
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="text-center py-20 bg-white">
                          <div className="animate-spin inline-block w-8 h-8 border-b-2 border-blue-600 rounded-full"></div>
                        </td>
                      </tr>
                    ) : reportData?.rows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-12 text-slate-500 font-medium">
                          No allocation logs found for the selected month.
                        </td>
                      </tr>
                    ) : (
                      reportData?.rows.map((row: any) => {
                        const totalHours = row.totalHours || 0;
                        const salary = row.salary || 0;

                        // Calculate grand row totals based on active tab view mode
                        let rowTotal = 0;
                        if (currentViewMode === 'hours') {
                          rowTotal = totalHours;
                        } else if (currentViewMode === 'percent') {
                          rowTotal = totalHours > 0 ? 1.0 : 0.0;
                        } else if (currentViewMode === 'salary') {
                          rowTotal = totalHours > 0 && salary > 0 ? salary : 0.0;
                        }

                        return (
                          <tr key={row.email} className="hover:bg-slate-50 transition-colors group/row">
                            
                            {/* Member Name */}
                            <td className={`px-6 py-4 text-sm font-bold sticky left-0 z-20 bg-white group-hover/row:bg-slate-50 border-r border-slate-100 ${totalHours === 0 ? 'text-rose-500' : 'text-slate-900'}`}>
                              {row.name}
                              {totalHours === 0 && (
                                <span className="block text-[10px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Missing Timesheet</span>
                              )}
                            </td>

                            {/* Email */}
                            <td className="px-6 py-4 text-sm text-slate-500 font-medium sticky left-[140px] z-20 bg-white group-hover/row:bg-slate-50 border-r border-slate-100 truncate max-w-[170px]">
                              {row.email}
                            </td>

                            {/* Salary */}
                            <td className="px-6 py-4 text-sm text-emerald-600 font-semibold sticky left-[320px] z-20 bg-white group-hover/row:bg-slate-50 border-r-2 border-slate-200 text-right font-mono">
                              {salary ? fmtCurrency(salary) : '-'}
                            </td>

                            {/* Dynamic Allocation Cells */}
                            {reportData.clients.map((c: any) => {
                              const hours = Number(row.allocations[c.name] || 0);
                              
                              let displayVal = '';
                              if (currentViewMode === 'hours') {
                                displayVal = hours > 0 ? hours.toFixed(2) : '';
                              } else if (currentViewMode === 'percent') {
                                displayVal = totalHours > 0 && hours > 0 ? `${((hours / totalHours) * 100).toFixed(1)}%` : '';
                              } else if (currentViewMode === 'salary') {
                                if (totalHours > 0 && salary > 0 && hours > 0) {
                                  displayVal = fmtCurrency((hours / totalHours) * salary);
                                }
                              }

                              return (
                                <td key={c.name} className="px-6 py-4 text-sm font-medium text-slate-600 font-mono text-right border-r border-slate-100">
                                  {displayVal}
                                </td>
                              );
                            })}

                            {/* Row Total */}
                            <td className="px-6 py-4 text-sm font-black text-slate-900 font-mono text-right bg-slate-50">
                              {currentViewMode === 'percent'
                                ? rowTotal > 0 ? '100.0%' : ''
                                : currentViewMode === 'salary'
                                ? rowTotal > 0 ? fmtCurrency(rowTotal) : ''
                                : rowTotal.toFixed(2)}
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Footers for Totals */}
                  {!loading && reportData && reportData.rows.length > 0 && (
                    <tfoot className="bg-slate-900 text-slate-100 border-t-2 border-slate-800 sticky bottom-0 z-30 shadow-[0_-2px_4px_rgba(0,0,0,0.06)]">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold bg-slate-900 sticky left-0 z-40 uppercase tracking-widest">TOTAL</td>
                        <td className="px-6 py-4 text-sm font-bold bg-slate-900 sticky left-[140px] z-40"></td>
                        <td className="px-6 py-4 text-sm font-black text-emerald-400 bg-slate-900 sticky left-[320px] z-40 border-r border-slate-700 text-right font-mono">
                          {fmtCurrency(stats.payroll)}
                        </td>
                        
                        {/* Dynamic Column Totals */}
                        {reportData.clients.map((c: any) => {
                          let colVal = 0;
                          
                          // Sum column based on view type
                          reportData.rows.forEach((row: any) => {
                            const hours = Number(row.allocations[c.name] || 0);
                            if (currentViewMode === 'hours') {
                              colVal += hours;
                            } else if (currentViewMode === 'percent') {
                              if (row.totalHours > 0) {
                                // Add allocation percentage share to total hours
                                const totalHoursSum = reportData.rows.reduce((sum: number, r: any) => sum + r.totalHours, 0);
                                colVal += totalHoursSum > 0 ? (hours / totalHoursSum) * 100 : 0;
                              }
                            } else if (currentViewMode === 'salary') {
                              if (row.totalHours > 0 && row.salary > 0) {
                                colVal += (hours / row.totalHours) * row.salary;
                              }
                            }
                          });

                          return (
                            <td key={c.name} className="px-6 py-4 text-sm font-black font-mono text-right text-slate-200 border-r border-slate-800">
                              {currentViewMode === 'percent'
                                ? colVal > 0 ? `${colVal.toFixed(1)}%` : '0.0%'
                                : currentViewMode === 'salary'
                                ? colVal > 0 ? fmtCurrency(colVal) : '-'
                                : colVal.toFixed(2)}
                            </td>
                          );
                        })}

                        {/* Grand Allocation Total */}
                        <td className="px-6 py-4 text-sm font-black font-mono text-right text-blue-400 bg-slate-800">
                          {currentViewMode === 'percent'
                            ? '100.0%'
                            : currentViewMode === 'salary'
                            ? fmtCurrency(stats.payroll)
                            : reportData.rows.reduce((acc: number, r: any) => acc + r.totalHours, 0).toFixed(2)}
                        </td>

                      </tr>
                    </tfoot>
                  )}

                </table>
              </div>

              {/* Zero-Allocation Alert Note */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-blue-950 block uppercase tracking-wider">Zero Hours Notification</span>
                  <p className="text-xs text-blue-700 mt-0.5 leading-relaxed font-medium">
                    Members highlighted in **red** have zero timesheet hours logged for this period. Finance must reconcile their entries before final monthly salary overhead distributions.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SALARY & BUDGET MANAGER */}
          {activeWorkspace === 'manager' && (
            <div className="space-y-8">
              
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                <Sliders className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-amber-950 block uppercase tracking-wider">Self-Contained DB Configuration</span>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed font-medium">
                    Manage payroll salaries, core verticals, and client budgets directly inside this console. All changes save directly to Supabase and immediately update the Financial Pivot Analyzer!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* A. User Salaries configuration */}
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Employee Payroll Registry
                    </h3>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[50vh]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Employee</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Salary (INR)</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm">
                              <span className="font-bold text-slate-950 block leading-tight">{u.name || u.email.split('@')[0]}</span>
                              <span className="text-[10px] text-slate-505 truncate block">{u.email}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono font-bold text-emerald-600">
                              {editingUserId === u.id ? (
                                <input
                                  type="number"
                                  value={editingSalaryVal}
                                  onChange={(e) => setEditingSalaryVal(e.target.value)}
                                  className="w-32 px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 text-right bg-white text-slate-950"
                                  autoFocus
                                />
                              ) : (
                                u.salary ? fmtCurrency(u.salary) : '₹0.00'
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {editingUserId === u.id ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSaveSalary(u.id)}
                                    disabled={savingSalary}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold uppercase tracking-wider"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="px-2 py-1 bg-slate-300 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingUserId(u.id);
                                    setEditingSalaryVal(u.salary?.toString() || '0');
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* B. Client Budgets & Cores configuration */}
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-emerald-600" />
                      Client Accounts Configuration
                    </h3>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[50vh]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Account</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Core Vertical</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Budget (INR)</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clients.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-bold text-slate-955">
                              {c.name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {editingClientId === c.id ? (
                                <input
                                  type="text"
                                  value={editingCoreVal}
                                  onChange={(e) => setEditingCoreVal(e.target.value)}
                                  className="w-24 px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 bg-white text-slate-950"
                                  placeholder="e.g. PR"
                                />
                              ) : (
                                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-black uppercase text-slate-600">
                                  {c.core || c.core_owner || 'Unassigned'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono font-bold text-emerald-600">
                              {editingClientId === c.id ? (
                                <input
                                  type="number"
                                  value={editingBudgetVal}
                                  onChange={(e) => setEditingBudgetVal(e.target.value)}
                                  className="w-28 px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 text-right bg-white text-slate-950"
                                />
                              ) : (
                                c.budget ? fmtCurrency(c.budget) : '₹0.00'
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {editingClientId === c.id ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSaveClientBudget(c.id)}
                                    disabled={savingBudget}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold uppercase tracking-wider"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingClientId(null)}
                                    className="px-2 py-1 bg-slate-300 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingClientId(c.id);
                                    setEditingBudgetVal(c.budget?.toString() || '0');
                                    setEditingCoreVal(c.core || c.core_owner || '');
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
