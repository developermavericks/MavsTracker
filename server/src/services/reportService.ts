import { supabase } from '../config/supabase';

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

  // Fetch all allocations for the month
  const { data: allocations, error } = await supabase
    .from('allocations_weekly')
    .select('*, users(name, email), clients(name, core_owner)')
    .eq('month', month);

  if (error) throw error;

  const byMember: Record<string, any> = {};
  const clientSet = new Set<string>();

  allocations.forEach((r: any) => {
    const email = r.users.email.toLowerCase();
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
  const table = view === 'weekly' ? 'allocations_weekly' : 'allocations_projected';
  
  const { data: allocations, error } = await supabase
    .from(table)
    .select('hours, clients(name)')
    .eq('month', month);

  if (error) throw error;

  const summary: Record<string, number> = {};
  allocations.forEach((r: any) => {
    const clientName = r.clients?.name || 'Unknown';
    summary[clientName] = (summary[clientName] || 0) + (Number(r.hours) || 0);
  });

  return Object.entries(summary)
    .map(([name, hours]) => ({ name, hours }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getClientRoster = async (month: string, clientName: string, view: 'weekly' | 'projected' = 'weekly') => {
  const table = view === 'weekly' ? 'allocations_weekly' : 'allocations_projected';
  
  const { data: allocations, error } = await supabase
    .from(table)
    .select('hours, users(name, email), clients(name)')
    .eq('month', month);

  if (error) throw error;

  const roster: Record<string, any> = {};
  allocations.forEach((r: any) => {
    if (r.clients?.name !== clientName) return;

    const email = r.users?.email || 'unknown';
    const name = r.users?.name || 'Unknown';
    const hours = Number(r.hours) || 0;

    if (!roster[email]) {
      roster[email] = { name, email, hours: 0 };
    }
    roster[email].hours += hours;
  });

  return Object.values(roster).sort((a: any, b: any) => a.name.localeCompare(b.name));
};
