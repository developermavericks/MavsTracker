import { supabase } from '../config/supabase';
import { isActiveUser, getActiveEmailsList } from '../config/activeUsers';

export const getEffectiveExitMonthsMap = async (): Promise<{
  byUserId: Record<string, string>;
  byEmail: Record<string, string>;
}> => {
  const { data: exitedUsers, error: uErr } = await supabase
    .from('users')
    .select('id, email, exit_date')
    .not('exit_date', 'is', null);
    
  const byUserId: Record<string, string> = {};
  const byEmail: Record<string, string> = {};
  
  if (uErr || !exitedUsers || exitedUsers.length === 0) {
    return { byUserId, byEmail };
  }
  
  // Fetch all allocations with hours > 0
  let logs: any[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('user_id, month, hours')
      .gt('hours', 0)
      .range(page * pageSize, (page + 1) * pageSize - 1);
      
    if (error) break;
    if (!data || data.length === 0) break;
    logs = logs.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  
  exitedUsers.forEach((u: any) => {
    const exitMonth = u.exit_date.substring(0, 7);
    const userLogs = logs.filter(l => l.user_id === u.id && l.month <= exitMonth && l.month >= '2025-11');
    
    let effMonth = '2025-10'; // Default: exclude starting Nov 2025
    if (userLogs.length > 0) {
      const months = userLogs.map(l => l.month).sort();
      effMonth = months[months.length - 1]; // Maximum active month
    }
    
    byUserId[u.id] = effMonth;
    if (u.email) {
      byEmail[u.email.toLowerCase()] = effMonth;
    }
  });
  
  return { byUserId, byEmail };
};

const normalizeClientForMaster = (client: string, groupBd: boolean) => {
  const s = String(client || '').trim();
  const low = s.toLowerCase();

  if (groupBd && (
    low === 'bd' ||
    low.startsWith('bd ') ||
    low.startsWith('bd-') ||
    low.startsWith('bd -') ||
    low.startsWith('bd/') ||
    low.startsWith('bd –') ||
    low.startsWith('bd —')
  )) return 'BD';

  return s;
};

export const getMasterReportData = async (month: string, options: any = {}) => {
  const { groupBd = true, groupLeave = true, groupInternal = true } = options;
  const { byEmail } = await getEffectiveExitMonthsMap();

  // Fetch all allocations for the month (paginated)
  let allocations: any[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error: fetchError } = await supabase
      .from('allocations_weekly')
      .select('*, users(name, email, exit_date, joining_date), clients(name, core_owner)')
      .eq('month', month)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (fetchError) throw fetchError;
    if (!data || data.length === 0) break;
    allocations = allocations.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  const byMember: Record<string, any> = {};
  const clientSet = new Set<string>();

  // Fetch all registered users from database
  const { data: dbUsers, error: uError } = await supabase
    .from('users')
    .select('name, email, exit_date, joining_date');
  if (uError) throw uError;

  // Pre-populate all registered users to ensure 100% visibility
  if (dbUsers) {
    dbUsers.forEach(u => {
      if (!u.email) return;

      // Exclude if joining month is in the future relative to the target report month
      const joinMonth = u.joining_date ? u.joining_date.substring(0, 7) : '2025-11';
      if (joinMonth > month) return;

      const normEmail = u.email.toLowerCase();

      // Exclude if exit date is set and their last active month is prior to this month
      if (u.exit_date) {
        const effExitMonth = byEmail[normEmail] || '2025-10';
        if (effExitMonth < month) return;
      }

      byMember[normEmail] = {
        name: u.name || normEmail.split('@')[0],
        email: normEmail,
        allocations: {},
        totalHours: 0
      };
    });
  }

  allocations.forEach((r: any) => {
    const email = r.users?.email?.toLowerCase();
    if (!email) return;

    // Exclude if joining month is in the future
    const joinMonth = r.users?.joining_date ? r.users.joining_date.substring(0, 7) : '2025-11';
    if (joinMonth > month) return;

    // Exclude if exit date is set and their last active month is prior to this month
    if (r.users?.exit_date) {
      const effExitMonth = byEmail[email] || '2025-10';
      if (effExitMonth < month) return;
    }

    const name = r.users.name;
    let client = normalizeClientForMaster(r.clients.name, groupBd);

    // Group Leave
    if (groupLeave && ['leave', 'personal commitments'].includes(client.toLowerCase())) {
      client = 'LEAVE';
    }

    // Group Internal
    const cLow = client.toLowerCase();
    const internalGroupList = [
      'internal – cs', 'internal - cs',
      'internal creative',
      'internal finance',
      'internal hr',
      'internal marketing',
      'internal tech',
      'internal training'
    ];
    
    if (groupInternal && internalGroupList.includes(cLow)) {
      client = 'Group Internal';
    }

    const hours = Number(r.hours) || 0;
    clientSet.add(client);

    if (!byMember[email]) {
      byMember[email] = { email, name, allocations: {} };
    }
    
    byMember[email].allocations[client] = (byMember[email].allocations[client] || 0) + hours;
  });

  return {
    month,
    clients: Array.from(clientSet).sort(),
    rows: Object.values(byMember).sort((a: any, b: any) => a.name.localeCompare(b.name)),
  };
};

export const getClientSummary = async (month: string, view: 'weekly' | 'projected' = 'weekly') => {
  const { byEmail } = await getEffectiveExitMonthsMap();
  const table = view === 'weekly' ? 'allocations_weekly' : 'allocations_projected';
  
  let allocations: any[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error: fetchError } = await supabase
      .from(table)
      .select('hours, clients(name), users(email, exit_date, joining_date)')
      .eq('month', month)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (fetchError) throw fetchError;
    if (!data || data.length === 0) break;
    allocations = allocations.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  const summary: Record<string, number> = {};
  allocations.forEach((r: any) => {
    const email = r.users?.email;
    if (!isActiveUser(email)) return;

    // Exclude if joining month is in the future
    const joinMonth = r.users?.joining_date ? r.users.joining_date.substring(0, 7) : '2025-11';
    if (joinMonth > month) return;

    // Exclude if exit date is set and their last active month is prior to this month
    if (r.users?.exit_date) {
      const effExitMonth = byEmail[email.toLowerCase()] || '2025-10';
      if (effExitMonth < month) return;
    }

    const clientName = r.clients?.name || 'Unknown';
    summary[clientName] = (summary[clientName] || 0) + (Number(r.hours) || 0);
  });

  return Object.entries(summary)
    .map(([name, hours]) => ({ name, hours }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getClientRoster = async (month: string, clientName: string, view: 'weekly' | 'projected' = 'weekly') => {
  const { byEmail } = await getEffectiveExitMonthsMap();
  const table = view === 'weekly' ? 'allocations_weekly' : 'allocations_projected';
  
  let allocations: any[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error: fetchError } = await supabase
      .from(table)
      .select('hours, users(name, email, exit_date, joining_date), clients(name)')
      .eq('month', month)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (fetchError) throw fetchError;
    if (!data || data.length === 0) break;
    allocations = allocations.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  const roster: Record<string, any> = {};
  allocations.forEach((r: any) => {
    if (r.clients?.name !== clientName) return;

    const email = r.users?.email || 'unknown';
    if (!isActiveUser(email)) return;

    // Exclude if joining month is in the future
    const joinMonth = r.users?.joining_date ? r.users.joining_date.substring(0, 7) : '2025-11';
    if (joinMonth > month) return;

    // Exclude if exit date is set and their last active month is prior to this month
    if (r.users?.exit_date) {
      const effExitMonth = byEmail[email.toLowerCase()] || '2025-10';
      if (effExitMonth < month) return;
    }

    const name = r.users?.name || 'Unknown';
    const hours = Number(r.hours) || 0;

    if (!roster[email]) {
      roster[email] = { name, email, hours: 0 };
    }
    roster[email].hours += hours;
  });

  return Object.values(roster).sort((a: any, b: any) => a.name.localeCompare(b.name));
};
