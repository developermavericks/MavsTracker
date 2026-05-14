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
