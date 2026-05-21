'use client';
// Trigger Vercel frontend rebuild
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { IndianRupee, Download, Users, Briefcase, RefreshCw, Layers, Sliders, CheckCircle2, AlertCircle, Edit2, BarChart3, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import { apiFetch } from '@/lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function FinancePortal() {
  const [activeWorkspace, setActiveWorkspace] = useState<'pivot' | 'manager' | 'analysis'>('pivot');
  const [currentViewMode, setCurrentViewMode] = useState<'hours' | 'percent' | 'salary'>('hours');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [groupBD, setGroupBD] = useState(false);
  const [groupLeave, setGroupLeave] = useState(false);
  const [groupInternal, setGroupInternal] = useState(false);
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

  // Fetch manager settings data when the tab or month changes
  useEffect(() => {
    if (activeWorkspace === 'manager') {
      fetchUsersAndClients();
    }
  }, [activeWorkspace, month]);

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
        apiFetch(`${apiUrl}/api/teams/all?month=${month}`),
        apiFetch(`${apiUrl}/api/clients?month=${month}`)
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

  // Analytics Data Helpers
  const analyticsData = useMemo(() => {
    if (!reportData || !reportData.clients.length || !reportData.rows.length) return null;

    // 1. Budget vs Actual
    const budgetVsActual = reportData.clients.map((c: any) => {
      let actualSpend = 0;
      reportData.rows.forEach((r: any) => {
        const hours = Number(r.allocations[c.name] || 0);
        if (r.totalHours > 0 && r.salary > 0) {
          actualSpend += (hours / r.totalHours) * r.salary;
        }
      });
      return {
        name: c.name,
        Budget: Number(c.budget) || 0,
        Actual: Math.round(actualSpend),
      };
    }).sort((a: any, b: any) => b.Budget - a.Budget);

    // 2. Efficiency (Billable vs Non-Billable)
    let billableSpend = 0;
    let nonBillableSpend = 0;
    reportData.rows.forEach((r: any) => {
      if (r.totalHours > 0 && r.salary > 0) {
        Object.keys(r.allocations).forEach((clientName) => {
          const hours = Number(r.allocations[clientName] || 0);
          const cost = (hours / r.totalHours) * r.salary;
          
          const isNonBillable = ['internal', 'leave', 'free_time', 'personal commitments'].includes(clientName.toLowerCase()) || clientName.toLowerCase().startsWith('group internal') || clientName.toLowerCase() === 'bd';
          
          if (isNonBillable) {
            nonBillableSpend += cost;
          } else {
            billableSpend += cost;
          }
        });
      }
    });

    const efficiencyData = [
      { name: 'Billable (Client Work)', value: Math.round(billableSpend), color: '#3b82f6' }, // blue-500
      { name: 'Non-Billable (Internal/Leave/BD)', value: Math.round(nonBillableSpend), color: '#f43f5e' }, // rose-500
    ];

    // 3. Core Vertical Distribution
    // Sum salary per vertical
    const verticalSpend: Record<string, number> = {};
    reportData.clients.forEach((c: any) => {
      const core = c.core || 'Unassigned';
      if (!verticalSpend[core]) verticalSpend[core] = 0;
      
      reportData.rows.forEach((r: any) => {
        const hours = Number(r.allocations[c.name] || 0);
        if (r.totalHours > 0 && r.salary > 0) {
          verticalSpend[core] += (hours / r.totalHours) * r.salary;
        }
      });
    });
    
    const coreVerticalData = Object.keys(verticalSpend).map(core => ({
      name: core,
      Spend: Math.round(verticalSpend[core])
    })).sort((a, b) => b.Spend - a.Spend);

    // 4. Top 5 Most Expensive Clients
    const topExpensiveClients = [...budgetVsActual]
      .sort((a, b) => b.Actual - a.Actual)
      .slice(0, 5);

    return {
      budgetVsActual,
      efficiencyData,
      coreVerticalData,
      topExpensiveClients
    };
  }, [reportData]);

  const budgetAnalysisData = useMemo(() => {
    if (!reportData || !reportData.clients.length || !reportData.rows.length) return [];

    const clientMetrics: Record<string, { name: string; budget: number; cost: number; revenue: number; profit: number }> = {};

    reportData.clients.forEach((c: any) => {
      const isGroupedName = ['group bd', 'group internal', 'group leave'].includes(c.name.toLowerCase());
      if (isGroupedName) return;

      clientMetrics[c.name] = {
        name: c.name,
        budget: Number(c.budget) || 0,
        cost: 0,
        revenue: Number(c.budget) || 0,
        profit: 0
      };
    });

    reportData.rows.forEach((r: any) => {
      const salary = Number(r.salary) || 0;
      const totalHours = Number(r.totalHours) || 0;
      if (salary === 0 || totalHours === 0) return;

      Object.entries(r.allocations).forEach(([clientName, hoursVal]) => {
        const hours = Number(hoursVal) || 0;
        if (hours === 0) return;

        const allocatedCost = salary * (hours / totalHours);

        if (!clientMetrics[clientName]) {
          const isGroupedName = ['group bd', 'group internal', 'group leave'].includes(clientName.toLowerCase());
          if (isGroupedName) return;

          clientMetrics[clientName] = {
            name: clientName,
            budget: 0,
            cost: 0,
            revenue: 0,
            profit: 0
          };
        }

        clientMetrics[clientName].cost += allocatedCost;
      });
    });

    return Object.values(clientMetrics).map(item => {
      const profit = item.revenue - item.cost;
      return {
        ...item,
        profit,
        costFormatted: Math.round(item.cost),
        revenueFormatted: Math.round(item.revenue),
        profitFormatted: Math.round(profit),
        profitMargin: item.revenue > 0 ? ((profit / item.revenue) * 100).toFixed(1) : '0'
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [reportData]);

  // ============================================================================
  // Analysis Tab States & Memo Helpers
  // ============================================================================
  const [analysisView, setAnalysisView] = useState<'employee' | 'client'>('employee');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);

  const daysInMonth = useMemo(() => {
    const [year, m] = month.split('-').map(Number);
    return new Date(year, m, 0).getDate();
  }, [month]);

  const getNormalizedClientName = (rawName: string) => {
    const s = String(rawName || '').trim();
    const low = s.toLowerCase();
    
    const isBd = low === 'bd' || low.startsWith('bd ') || low.startsWith('bd-') || low.startsWith('bd -') || low.startsWith('bd/') || low.startsWith('bd –') || low.startsWith('bd —');
    const isInternal = ['internal – cs', 'internal - cs', 'internal creative', 'internal finance', 'internal hr', 'internal marketing', 'internal tech', 'internal training'].includes(low) || low.startsWith('internal');
    const isLeave = ['leave', 'personal commitments'].includes(low) || low.startsWith('leave');

    if (groupBD && isBd) return 'Group BD';
    if (groupInternal && isInternal) return 'Group Internal';
    if (groupLeave && isLeave) return 'Group LEAVE';

    if (low === 'chargezone') return 'Chargezone (TECSO)';
    if (low === 'omnicom global') return 'Omnicom Global Solutions';
    if (low === 'pixel') return 'Pixxel';
    if (low === 'olster') return 'Oister';
    if (low === 'optimus infrastructure') return 'Optiemus Infracom';
    if (low === 'people matteras') return 'People Matters';
    if (low === 'haystack') return 'Haystack';
    if (low.startsWith('astra security')) return 'Astra Security';
    if (low.includes('lunch')) return 'Lunch Break';
    if (low.includes('free_time')) return 'FREE_TIME';
    
    return s;
  };

  const getDailyDistribution = (startDateStr: string, endDateStr: string, totalHours: number) => {
    if (startDateStr === endDateStr) {
      return { [startDateStr]: totalHours };
    }
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const dates: string[] = [];
    
    let curr = new Date(start);
    while (curr <= end) {
      const day = curr.getDay();
      if (day !== 0 && day !== 6) { // Weekdays only
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }
      curr.setDate(curr.getDate() + 1);
    }

    if (dates.length === 0) {
      curr = new Date(start);
      while (curr <= end) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
        curr.setDate(curr.getDate() + 1);
      }
    }

    const dailyHours: Record<string, number> = {};
    if (dates.length > 0) {
      const share = totalHours / dates.length;
      dates.forEach(d => {
        dailyHours[d] = share;
      });
    }
    return dailyHours;
  };

  const barChartData = useMemo(() => {
    if (!reportData || !reportData.rawAllocations) return [];

    const totals: Record<string, number> = {};

    reportData.rawAllocations.forEach((alloc: any) => {
      const uName = alloc.users?.name || alloc.users?.email?.split('@')[0] || 'Unknown';
      const cName = getNormalizedClientName(alloc.clients?.name || 'Unknown Client');
      const key = analysisView === 'employee' ? uName : cName;
      
      totals[key] = (totals[key] || 0) + (Number(alloc.hours) || 0);
    });

    return Object.keys(totals)
      .map(name => ({
        name,
        Hours: Math.round(totals[name] * 10) / 10
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reportData, analysisView, groupBD, groupLeave, groupInternal]);

  const dailyLineChartData = useMemo(() => {
    if (!reportData || !reportData.rawAllocations) return { chartData: [], entities: [] };

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthInt = parseInt(monthStr);

    const entityDailyHours: Record<string, Record<number, number>> = {};
    const uniqueEntities = new Set<string>();

    reportData.rawAllocations.forEach((alloc: any) => {
      const uName = alloc.users?.name || alloc.users?.email?.split('@')[0] || 'Unknown';
      const cName = getNormalizedClientName(alloc.clients?.name || 'Unknown Client');
      const key = analysisView === 'employee' ? uName : cName;
      const hours = Number(alloc.hours) || 0;

      if (hours <= 0) return;

      uniqueEntities.add(key);

      if (!entityDailyHours[key]) {
        entityDailyHours[key] = {};
      }

      const dailyDistribution = getDailyDistribution(alloc.start_date, alloc.end_date, hours);
      Object.entries(dailyDistribution).forEach(([dateStr, dailyHour]) => {
        const date = new Date(dateStr);
        if (date.getFullYear() === year && (date.getMonth() + 1) === monthInt) {
          const d = date.getDate();
          entityDailyHours[key][d] = (entityDailyHours[key][d] || 0) + dailyHour;
        }
      });
    });

    const sortedEntities = Array.from(uniqueEntities).sort((a, b) => a.localeCompare(b));

    const chartData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const row: Record<string, any> = { day: d };
      sortedEntities.forEach(entity => {
        const rawHours = entityDailyHours[entity]?.[d] || 0;
        row[entity] = Math.round(rawHours * 10) / 10;
      });
      chartData.push(row);
    }

    return {
      chartData,
      entities: sortedEntities
    };
  }, [reportData, month, daysInMonth, analysisView, groupBD, groupLeave, groupInternal]);

  // State to track which chart is expanded in modal overlay
  const [expandedChart, setExpandedChart] = useState<'bar' | 'line' | 'team' | 'costVsRevenue' | 'profitVsLoss' | 'profitabilityMargin' | null>(null);

  // Helper to resolve client names to their core leadership team owners
  const getClientCoreTeam = (rawName: string): string => {
    const s = String(rawName || '').trim();
    const low = s.toLowerCase();

    const archanaClients = ["adda education", "capitaland", "chargezone", "college vidya", "goldi solar", "gradright", "icreate", "merrakki", "murf ai", "musashi", "musashi-d", "omnicom global", "pearl academy", "plaksha"];
    const mitaliClients = ["angara", "bambrew", "chupps", "clinikally", "eruditus", "fujifilm", "gnfz", "google", "inc.5", "innover", "jci", "joshtalks", "milliken", "modi illva", "nec", "noise", "nuuk", "people matters", "people matteras", "qubo", "truworth", "vivo", "wadhwani", "haystack"];
    const smritiClients = ["aptiv", "astra security", "avpn", "axitrust", "bcg", "bd - bright money", "decentro", "face", "hasbro", "mff", "mpokket", "msdf", "oister", "olster", "paasa", "payglocal", "pixxel", "pixel", "plum", "pyt", "razorpay", "room to read", "scale", "scapia", "sense ai", "shubhanshu", "straive", "truefan ai", "udaiti", "udhyam", "zeno"];
    const chetanClients = ["capital league", "crazzy bosses", "optiemus infracom", "optimus infrastructure", "pmi"];

    if (archanaClients.some(c => low.includes(c))) return "Archana";
    if (mitaliClients.some(c => low.includes(c))) return "Mitali";
    if (smritiClients.some(c => low.includes(c))) return "Smriti";
    if (chetanClients.some(c => low.includes(c))) return "Chetan";

    return "Unassigned";
  };

  // Compute Core Team-wise Hours allocation distribution
  const coreTeamData = useMemo(() => {
    if (!reportData || !reportData.rawAllocations) return [];

    const totals: Record<string, number> = {
      "Archana": 0,
      "Mitali": 0,
      "Smriti": 0,
      "Chetan": 0,
      "Unassigned": 0
    };

    reportData.rawAllocations.forEach((alloc: any) => {
      const cName = alloc.clients?.name || 'Unknown';
      const core = getClientCoreTeam(cName);
      totals[core] = (totals[core] || 0) + (Number(alloc.hours) || 0);
    });

    const colorsMap: Record<string, string> = {
      "Archana": "#2563eb",   // Vivid Blue
      "Mitali": "#10b981",    // Emerald Green
      "Smriti": "#ec4899",    // Rose Pink
      "Chetan": "#8b5cf6",    // Purple
      "Unassigned": "#64748b" // Slate Gray
    };

    return Object.keys(totals).map(name => ({
      name,
      value: Math.round(totals[name] * 10) / 10,
      color: colorsMap[name] || '#cbd5e1'
    })).filter(item => item.value > 0);
  }, [reportData]);

  // Automatically check the top 5 entities to populate line chart without clutter
  useEffect(() => {
    if (dailyLineChartData.entities.length > 0) {
      setSelectedEntities(dailyLineChartData.entities.slice(0, 5));
    } else {
      setSelectedEntities([]);
    }
  }, [dailyLineChartData.entities]);

  const CHART_COLORS = [
    '#2563eb', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#8b5cf6', // purple
    '#f43f5e', // rose
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#14b8a6', // teal
    '#f97316', // orange
  ];

  return (
    <div className="space-y-8 relative">

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
          tooltip="Sum of monthly salaries of all active employees/consultants in the database"
        />
        <StatsCard
          label="Aggregate Client Budget"
          value={fmtCurrency(stats.totalBudget)}
          icon={Briefcase}
          color="bg-emerald-600"
          tooltip="Total combined monthly budgets assigned to active client accounts"
        />
        <StatsCard
          label="Target Accounts"
          value={stats.activeClients.toString()}
          icon={Layers}
          color="bg-indigo-600"
          tooltip="Total count of active client accounts tracked this month"
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
            onClick={() => setActiveWorkspace('analysis')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeWorkspace === 'analysis'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Allocation Analysis Dashboard
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
                          className="px-6 py-3 text-xs font-bold text-center text-slate-700 bg-slate-100/80 border-r-4 border-slate-300 uppercase tracking-widest font-black"
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
                      {reportData?.clients.map((c: any, i: number) => {
                        const isLastInGroup = i === reportData.clients.length - 1 || c.core !== reportData.clients[i + 1].core;
                        return (
                          <th
                            key={c.name}
                            className={`px-6 py-3 text-xs font-bold text-slate-600 text-right min-w-[120px] ${isLastInGroup ? 'border-r-4 border-slate-300' : 'border-r border-slate-200'}`}
                          >
                            {c.name}
                          </th>
                        );
                      })}
                      <th className="px-6 py-3 text-xs font-bold text-slate-950 text-right font-black bg-slate-100/50">Total</th>
                    </tr>

                    {/* Header Row 3: Client Budgets */}
                    <tr className="border-b-2 border-slate-300 bg-emerald-50/50">
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 sticky left-0 z-40 bg-emerald-50"></th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-500 sticky left-[140px] z-40 bg-emerald-50"></th>
                      <th className="px-6 py-3 text-xs font-bold text-slate-800 sticky left-[320px] z-40 bg-emerald-50 border-r border-slate-200 text-right">Budget</th>
                      {reportData?.clients.map((c: any, i: number) => {
                        const isLastInGroup = i === reportData.clients.length - 1 || c.core !== reportData.clients[i + 1].core;
                        return (
                          <th
                            key={c.name}
                            className={`px-6 py-3 text-xs font-black text-emerald-800 text-right bg-emerald-50/70 ${isLastInGroup ? 'border-r-4 border-slate-300' : 'border-r border-slate-200'}`}
                          >
                            {c.budget ? fmtCurrency(c.budget) : '-'}
                          </th>
                        );
                      })}
                      <th className="px-6 py-3 text-xs font-bold text-slate-50 bg-emerald-50"></th>
                    </tr>

                  </thead>

                  {/* Body */}
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="text-center py-20 bg-white dark:bg-slate-900">
                          <div className="flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          </div>
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
                            {reportData.clients.map((c: any, i: number) => {
                              const hours = Number(row.allocations[c.name] || 0);
                              const isLastInGroup = i === reportData.clients.length - 1 || c.core !== reportData.clients[i + 1].core;
                              
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
                                <td key={c.name} className={`px-6 py-4 text-sm font-medium text-slate-600 font-mono text-right ${isLastInGroup ? 'border-r-4 border-slate-300' : 'border-r border-slate-100'}`}>
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
                        {reportData.clients.map((c: any, i: number) => {
                          const isLastInGroup = i === reportData.clients.length - 1 || c.core !== reportData.clients[i + 1].core;
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
                            <td key={c.name} className={`px-6 py-4 text-sm font-black font-mono text-right text-slate-200 ${isLastInGroup ? 'border-r-4 border-slate-600' : 'border-r border-slate-800'}`}>
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

          {/* TAB 3: ALLOCATION ANALYSIS DASHBOARD */}
          {activeWorkspace === 'analysis' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Header and Controls Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Allocation Analysis Workspace
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compare employee and client working hour trends side-by-side.
                  </p>
                </div>

                {/* Switcher Toggle (Employee / Client View) */}
                <div className="flex bg-slate-200/60 p-1 rounded-xl">
                  <button
                    onClick={() => setAnalysisView('employee')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                      analysisView === 'employee'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Employee View
                  </button>
                  <button
                    onClick={() => setAnalysisView('client')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
                      analysisView === 'client'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Client View
                  </button>
                </div>
              </div>

              {/* Both charts container: Grid 1col on mobile, 2col on desktop for side-by-side */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
                
                {/* Chart 1: Bar Graph (Left Side) */}
                <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[24px] p-6 flex flex-col min-h-[480px] relative">
                  {loading && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[24px] animate-in fade-in duration-200">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CHART 1</span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">
                        Total Allocation Hours ({analysisView === 'employee' ? 'by Employee' : 'by Client'})
                      </h4>
                      <p className="text-xs text-slate-500">
                        Alphabetically sorted total logged hours for this month. Scroll horizontally if needed.
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedChart('bar')}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
                      title="Enlarge Chart"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  {barChartData.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-100 rounded-xl">
                      No data to display for this month.
                    </div>
                  ) : (
                    <div className="flex-1 w-full overflow-x-auto custom-scrollbar pt-4">
                      <div style={{ minWidth: `${Math.max(barChartData.length * 50, 400)}px` }} className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              stroke="#64748b" 
                              fontSize={10} 
                              fontWeight="bold" 
                              tickLine={false} 
                              axisLine={false} 
                              interval={0}
                              angle={-20}
                              dx={-5}
                              dy={5}
                            />
                            <YAxis 
                              stroke="#64748b" 
                              fontSize={10} 
                              fontWeight="bold" 
                              tickLine={false} 
                              axisLine={false} 
                              allowDecimals={false}
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                background: '#0f172a', 
                                border: 'none', 
                                borderRadius: '12px', 
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                              }}
                            />
                            <Bar 
                              dataKey="Hours" 
                              fill="#3b82f6" 
                              radius={[8, 8, 0, 0]}
                            >
                              {barChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart 2: Line Chart (Right Side) */}
                <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[24px] p-6 flex flex-col min-h-[480px]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CHART 2</span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">
                        Daily Hours Timeline Trend
                      </h4>
                      <p className="text-xs text-slate-500">
                        Day-by-day allocation curves. Select up to 10 entities to overlay.
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedChart('line')}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
                      title="Enlarge Chart"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  {dailyLineChartData.chartData.length === 0 || dailyLineChartData.entities.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-100 rounded-xl">
                      No daily records found to map.
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-[350px]">
                      
                      {/* Checkbox Selector Column */}
                      <div className="w-full lg:w-44 flex flex-col border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50 flex-shrink-0">
                        <div className="bg-slate-100 px-3 py-2 text-[10px] font-black uppercase text-slate-600 tracking-wider">
                          Toggle Lines
                        </div>
                        <div className="p-2 overflow-y-auto max-h-[160px] lg:max-h-[300px] space-y-1.5 custom-scrollbar flex-1">
                          {dailyLineChartData.entities.map((entity, index) => {
                            const isChecked = selectedEntities.includes(entity);
                            const color = CHART_COLORS[index % CHART_COLORS.length];
                            
                            return (
                              <label 
                                key={entity}
                                className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100 transition-colors select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedEntities(prev => [...prev, entity]);
                                    } else {
                                      setSelectedEntities(prev => prev.filter(x => x !== entity));
                                    }
                                  }}
                                  className="peer appearance-none w-3.5 h-3.5 border border-slate-300 rounded checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
                                />
                                <span 
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-[10px] font-bold text-slate-600 truncate flex-1" title={entity}>
                                  {entity}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actual Line Chart Area */}
                      <div className="flex-1 min-w-0 h-[280px] lg:h-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyLineChartData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis 
                              dataKey="day" 
                              stroke="#64748b" 
                              fontSize={10} 
                              fontWeight="bold" 
                              tickLine={false} 
                              axisLine={false}
                              label={{ value: 'Day of Month', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                            />
                            <YAxis 
                              stroke="#64748b" 
                              fontSize={10} 
                              fontWeight="bold" 
                              tickLine={false} 
                              axisLine={false} 
                              allowDecimals={false}
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                background: '#0f172a', 
                                border: 'none', 
                                borderRadius: '12px', 
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                              }}
                            />
                            {selectedEntities.map((entity) => {
                              const globalIndex = dailyLineChartData.entities.indexOf(entity);
                              const color = CHART_COLORS[globalIndex % CHART_COLORS.length];
                              
                              return (
                                <Line
                                  key={entity}
                                  type="monotone"
                                  dataKey={entity}
                                  stroke={color}
                                  strokeWidth={3}
                                  dot={{ r: 2 }}
                                  activeDot={{ r: 4 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                    </div>
                  )}

                </div>

              </div>

              {/* CORE TEAM & UNASSIGNED DISTRIBUTION CHART CARD */}
              <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[24px] p-6 flex flex-col relative">
                {loading && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[24px] animate-in fade-in duration-200">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                )}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">CORE TEAM DISTRIBUTION</span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">
                      Leadership Core Team & Unassigned Allocation Share
                    </h4>
                    <p className="text-xs text-slate-500">
                      Proportional distribution of working hours across teams managed under the four core members and the Unassigned category.
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedChart('team')}
                    className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
                    title="Enlarge Chart"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {coreTeamData.length === 0 ? (
                  <div className="min-h-[200px] flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-100 rounded-xl">
                    No core team allocations found for this month.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    {/* Left Column: Gorgeous Donut Chart */}
                    <div className="md:col-span-5 h-[260px] w-full flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={coreTeamData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={105}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {coreTeamData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              background: '#0f172a',
                              border: 'none',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Center Stats overlay for donut */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Hours</span>
                        <span className="text-2xl font-black text-slate-900 mt-0.5">
                          {coreTeamData.reduce((acc, c) => acc + c.value, 0).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Right Column: Leadership list table details */}
                    <div className="md:col-span-7 space-y-3">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-2">
                        Core Team Allocation Summary
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {coreTeamData.map((entry) => {
                          const totalHoursSum = coreTeamData.reduce((sum, item) => sum + item.value, 0);
                          const pct = totalHoursSum > 0 ? ((entry.value / totalHoursSum) * 100).toFixed(1) : '0';
                          return (
                            <div 
                              key={entry.name} 
                              className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all duration-200"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span 
                                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <div className="min-w-0">
                                  <span className="text-sm font-bold text-slate-800 block leading-tight">{entry.name} Team</span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{pct}% Share</span>
                                </div>
                              </div>
                              <div className="text-right pl-2">
                                <span className="text-sm font-black text-slate-900 block font-mono">
                                  {entry.value.toFixed(1)}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400">Hours</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FEATURE 2: BUDGET-BASED FINANCIAL ANALYSIS BOARD */}
              <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[32px] p-8 flex flex-col space-y-8 relative">
                {loading && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[32px] animate-in fade-in duration-200">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">Financial Overview</span>
                  <h4 className="text-xl font-bold text-slate-900 mt-1">
                    Client Budget vs Cost & Profitability Analysis
                  </h4>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Visualize client-wise cost distribution (based on hours allocated and salary payroll) compared against client budgets for <strong>{month}</strong>.
                  </p>
                </div>

                {budgetAnalysisData.length === 0 ? (
                  <div className="min-h-[200px] flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-100 rounded-xl">
                    No financial data available for this month. Please configure budgets and salaries in the Manager tab.
                  </div>
                ) : (
                  <>
                    {/* Key Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Monthly Budget (Revenue)</span>
                        <span className="text-2xl font-black text-emerald-600 block mt-1 font-mono">
                          {fmtCurrency(budgetAnalysisData.reduce((sum, item) => sum + item.revenue, 0))}
                        </span>
                      </div>
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Allocation Cost</span>
                        <span className="text-2xl font-black text-rose-600 block mt-1 font-mono">
                          {fmtCurrency(budgetAnalysisData.reduce((sum, item) => sum + item.cost, 0))}
                        </span>
                      </div>
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Net Profit / Loss</span>
                        {(() => {
                          const netProfit = budgetAnalysisData.reduce((sum, item) => sum + item.profit, 0);
                          return (
                            <span className={`text-2xl font-black block mt-1 font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {fmtCurrency(netProfit)}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Gorgeous 2-Column charts layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                      
                      {/* Chart 1: Cost vs Revenue Grouped Bar Chart */}
                      <div className="border border-slate-100 rounded-3xl p-6 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Cost vs Revenue Comparison</span>
                            <h5 className="text-sm font-bold text-slate-800 mt-0.5">Budgeted Revenue & Distributed Labor Cost</h5>
                          </div>
                          <button
                            onClick={() => setExpandedChart('costVsRevenue')}
                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all shadow-sm"
                            title="Enlarge Chart"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="w-full overflow-x-auto custom-scrollbar select-none pb-2">
                          <div style={{ minWidth: budgetAnalysisData.length > 0 ? `${Math.max(600, budgetAnalysisData.length * 60)}px` : '100%', height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={budgetAnalysisData} margin={{ top: 20, right: 10, left: 10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  stroke="#64748b" 
                                  fontSize={8} 
                                  fontWeight="bold" 
                                  tickLine={false} 
                                  axisLine={false}
                                  interval={0}
                                  angle={-30}
                                  dx={-8}
                                  dy={8}
                                />
                                <YAxis stroke="#64748b" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                                <RechartsTooltip 
                                  formatter={(v) => [fmtCurrency(Number(v)), '']}
                                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                <Bar dataKey="revenueFormatted" name="Revenue (Budget)" fill="#10b981" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="costFormatted" name="Allocated Labor Cost" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Chart 2: Net Profit Margin per Client */}
                      <div className="border border-slate-100 rounded-3xl p-6 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Net Profit / Loss per Client</span>
                            <h5 className="text-sm font-bold text-slate-800 mt-0.5">Absolute Net Margin Generated</h5>
                          </div>
                          <button
                            onClick={() => setExpandedChart('profitVsLoss')}
                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all shadow-sm"
                            title="Enlarge Chart"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="w-full overflow-x-auto custom-scrollbar select-none pb-2">
                          <div style={{ minWidth: budgetAnalysisData.length > 0 ? `${Math.max(600, budgetAnalysisData.length * 60)}px` : '100%', height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={budgetAnalysisData} margin={{ top: 20, right: 10, left: 10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  stroke="#64748b" 
                                  fontSize={8} 
                                  fontWeight="bold" 
                                  tickLine={false} 
                                  axisLine={false}
                                  interval={0}
                                  angle={-30}
                                  dx={-8}
                                  dy={8}
                                />
                                <YAxis stroke="#64748b" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                                <RechartsTooltip 
                                  formatter={(v) => [fmtCurrency(Number(v)), 'Net Profit/Loss']}
                                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="profitFormatted" name="Net Profit / Loss" radius={[6, 6, 0, 0]}>
                                  {budgetAnalysisData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Chart 3 & Details Table Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                      
                      {/* Left: Profit Margin Percentages Line Chart */}
                      <div className="lg:col-span-5 border border-slate-100 rounded-3xl p-6 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Profitability Margin (%)</span>
                            <h5 className="text-sm font-bold text-slate-800 mt-0.5">Net Profit Margin by Client</h5>
                          </div>
                          <button
                            onClick={() => setExpandedChart('profitabilityMargin')}
                            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all shadow-sm"
                            title="Enlarge Chart"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="w-full overflow-x-auto custom-scrollbar select-none pb-2">
                          <div style={{ minWidth: budgetAnalysisData.length > 0 ? `${Math.max(450, budgetAnalysisData.filter(item => item.revenue > 0).length * 60)}px` : '100%', height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={budgetAnalysisData.filter(item => item.revenue > 0)} margin={{ top: 20, right: 10, left: 10, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  stroke="#64748b" 
                                  fontSize={8} 
                                  fontWeight="bold" 
                                  tickLine={false} 
                                  axisLine={false}
                                  interval={0}
                                  angle={-30}
                                  dx={-8}
                                  dy={8}
                                />
                                <YAxis stroke="#64748b" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                <RechartsTooltip 
                                  formatter={(v) => [`${v}%`, 'Margin']}
                                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Line type="monotone" dataKey="profitMargin" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Right: Gorgeous Detailed Tabular breakdown */}
                      <div className="lg:col-span-7 border border-slate-100 rounded-3xl p-6 bg-white space-y-4">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Detailed Financial Breakdown</span>
                          <h5 className="text-sm font-bold text-slate-800 mt-0.5">Client Profitability Registry</h5>
                        </div>
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Revenue</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Labor Cost</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Net Profit</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Margin</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs">
                              {budgetAnalysisData.map((item) => (
                                <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{fmtCurrency(item.revenue)}</td>
                                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-500">{fmtCurrency(item.cost)}</td>
                                  <td className={`px-4 py-3 text-right font-mono font-bold ${item.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {fmtCurrency(item.profit)}
                                  </td>
                                  <td className={`px-4 py-3 text-right font-bold ${item.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {item.profitMargin}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </>
                )}
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

      {/* Expanded Chart Overlay Modal */}
      {expandedChart && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-955/70 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 shadow-2xl w-full max-w-[92vw] h-[86vh] flex flex-col p-6 md:p-8 relative">
            
            {/* Header of Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  {expandedChart === 'team' ? 'Core Team Distribution' : expandedChart === 'bar' ? 'Total Hours Bar Chart' : 'Daily Hours Line Chart'}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {expandedChart === 'team' 
                    ? 'Core Leadership Team & Unassigned Allocation Share' 
                    : expandedChart === 'bar' 
                    ? `Total Allocation Hours (${analysisView === 'employee' ? 'by Employee' : 'by Client'})` 
                    : 'Daily Hours Timeline Trend Curve'}
                </h3>
              </div>

              {/* Minimize Action Button */}
              <button
                onClick={() => setExpandedChart(null)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-sm"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Minimize</span>
              </button>
            </div>

            {/* Modal Chart Content Container */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center">
              {expandedChart === 'team' && (
                <div className="w-full h-full flex flex-col md:flex-row items-center gap-8">
                  {/* Left Side: Pie Chart */}
                  <div className="flex-1 w-full h-[80%] min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={coreTeamData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={130}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {coreTeamData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            background: '#0f172a',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center Stats overlay for donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Hours</span>
                      <span className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">
                        {coreTeamData.reduce((acc, c) => acc + c.value, 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Right Side: Legend Table */}
                  <div className="w-full md:w-80 space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Breakdown List
                    </h4>
                    <div className="space-y-3">
                      {coreTeamData.map((entry) => {
                        const totalHoursSum = coreTeamData.reduce((sum, item) => sum + item.value, 0);
                        const pct = totalHoursSum > 0 ? ((entry.value / totalHoursSum) * 100).toFixed(1) : '0';
                        return (
                          <div key={entry.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-sm font-bold text-slate-700">{entry.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-slate-900 block">{entry.value.toFixed(1)} hrs</span>
                              <span className="text-[10px] font-black text-slate-400">{pct}% share</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {expandedChart === 'bar' && (
                <div className="w-full h-full overflow-x-auto custom-scrollbar pt-2">
                  <div style={{ minWidth: `${Math.max(barChartData.length * 60, 600)}px` }} className="h-[90%]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={11} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false} 
                          interval={0}
                          angle={-25}
                          dx={-10}
                          dy={10}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={11} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false} 
                          allowDecimals={false}
                        />
                        <RechartsTooltip 
                          contentStyle={{ 
                            background: '#0f172a', 
                            border: 'none', 
                            borderRadius: '12px', 
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        />
                        <Bar 
                          dataKey="Hours" 
                          fill="#3b82f6" 
                          radius={[12, 12, 0, 0]}
                        >
                          {barChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {expandedChart === 'line' && (
                <div className="w-full h-full flex flex-col md:flex-row gap-6">
                  {/* Sidebar Checkbox List */}
                  <div className="w-full md:w-56 flex flex-col border border-slate-100 rounded-xl overflow-hidden bg-slate-50">
                    <div className="bg-slate-200 px-3 py-2 text-xs font-black uppercase text-slate-700 tracking-wider">
                      Toggle Lines
                    </div>
                    <div className="p-3 overflow-y-auto space-y-2 custom-scrollbar flex-1">
                      {dailyLineChartData.entities.map((entity, index) => {
                        const isChecked = selectedEntities.includes(entity);
                        const color = CHART_COLORS[index % CHART_COLORS.length];
                        
                        return (
                          <label 
                            key={entity}
                            className="flex items-center gap-2.5 cursor-pointer p-1.5 rounded hover:bg-slate-100 transition-colors select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEntities(prev => [...prev, entity]);
                                } else {
                                  setSelectedEntities(prev => prev.filter(x => x !== entity));
                                }
                              }}
                              className="peer appearance-none w-4 h-4 border border-slate-300 rounded checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
                            />
                            <span 
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs font-bold text-slate-700 truncate flex-1">
                              {entity}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Line Chart */}
                  <div className="flex-1 min-w-0">
                    <ResponsiveContainer width="100%" height="95%">
                      <LineChart data={dailyLineChartData.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis 
                          dataKey="day" 
                          stroke="#64748b" 
                          fontSize={11} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          label={{ value: 'Day of Month', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={11} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false} 
                          allowDecimals={false}
                        />
                        <RechartsTooltip 
                          contentStyle={{ 
                            background: '#0f172a', 
                            border: 'none', 
                            borderRadius: '12px', 
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        />
                        {selectedEntities.map((entity) => {
                          const globalIndex = dailyLineChartData.entities.indexOf(entity);
                          const color = CHART_COLORS[globalIndex % CHART_COLORS.length];
                          
                          return (
                            <Line
                              key={entity}
                              type="monotone"
                              dataKey={entity}
                              stroke={color}
                              strokeWidth={3}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {expandedChart === 'costVsRevenue' && (
                <div className="w-full h-full overflow-x-auto custom-scrollbar select-none pt-2">
                  <div style={{ minWidth: `${Math.max(budgetAnalysisData.length * 90, 1200)}px` }} className="h-[90%]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetAnalysisData} margin={{ top: 20, right: 10, left: 10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={10} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          interval={0}
                          angle={-25}
                          dx={-10}
                          dy={10}
                        />
                        <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                        <RechartsTooltip 
                          formatter={(v) => [fmtCurrency(Number(v)), '']}
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="revenueFormatted" name="Revenue (Budget)" fill="#10b981" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="costFormatted" name="Allocated Labor Cost" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {expandedChart === 'profitVsLoss' && (
                <div className="w-full h-full overflow-x-auto custom-scrollbar select-none pt-2">
                  <div style={{ minWidth: `${Math.max(budgetAnalysisData.length * 90, 1200)}px` }} className="h-[90%]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={budgetAnalysisData} margin={{ top: 20, right: 10, left: 10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={10} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          interval={0}
                          angle={-25}
                          dx={-10}
                          dy={10}
                        />
                        <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                        <RechartsTooltip 
                          formatter={(v) => [fmtCurrency(Number(v)), 'Net Profit/Loss']}
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="profitFormatted" name="Net Profit / Loss" radius={[8, 8, 0, 0]}>
                          {budgetAnalysisData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {expandedChart === 'profitabilityMargin' && (
                <div className="w-full h-full overflow-x-auto custom-scrollbar select-none pt-2">
                  <div style={{ minWidth: `${Math.max(budgetAnalysisData.filter(item => item.revenue > 0).length * 90, 1200)}px` }} className="h-[90%]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={budgetAnalysisData.filter(item => item.revenue > 0)} margin={{ top: 20, right: 10, left: 10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#64748b" 
                          fontSize={10} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          interval={0}
                          angle={-25}
                          dx={-10}
                          dy={10}
                        />
                        <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                        <RechartsTooltip 
                          formatter={(v) => [`${v}%`, 'Margin']}
                          contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Line type="monotone" dataKey="profitMargin" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
