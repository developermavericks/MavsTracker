import { supabase } from '../config/supabase';
import ExcelJS from 'exceljs';
import { isActiveUser, getActiveEmailsList } from '../config/activeUsers';
import { getEffectiveExitMonthsMap } from './reportService';

const isLeaveClient = (name: string) => {
  return ['leave', 'personal commitments'].includes(name.toLowerCase());
};

const isBdClient = (name: string) => {
  const low = name.toLowerCase();
  return (
    low === 'bd' ||
    low.startsWith('bd ') ||
    low.startsWith('bd-') ||
    low.startsWith('bd -') ||
    low.startsWith('bd/') ||
    low.startsWith('bd –') ||
    low.startsWith('bd —')
  );
};

const isInternalClient = (name: string) => {
  const low = name.toLowerCase();
  const internalGroupList = [
    'internal – cs',
    'internal - cs',
    'internal creative',
    'internal finance',
    'internal hr',
    'internal marketing',
    'internal tech',
    'internal training'
  ];
  return internalGroupList.includes(low);
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

export const getCoreMasterAllocations = async (opts: {
  month: string;
  group_bd?: boolean;
  group_leave?: boolean;
  group_internal?: boolean;
}) => {
  const month = opts.month;
  const groupBd = opts.group_bd !== false;
  const groupLeave = opts.group_leave !== false;
  const groupInternal = opts.group_internal !== false;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Month must be YYYY-MM.');
  }

  // 1. Fetch first allocation month for every user to handle Join Month Logic (paginated)
  let allWeeklyLogs: any[] = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('user_id, month')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    allWeeklyLogs = allWeeklyLogs.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  const firstMonthByUser: Record<string, string> = {};
  if (allWeeklyLogs) {
    allWeeklyLogs.forEach((row: any) => {
      const uId = row.user_id;
      const m = row.month;
      if (uId && m) {
        if (!firstMonthByUser[uId] || m < firstMonthByUser[uId]) {
          firstMonthByUser[uId] = m;
        }
      }
    });
  }

  // 2. Fetch all allocations for selected month (paginated)
  let allocations: any[] = [];
  page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('allocations_weekly')
      .select('*, users(*), clients(*)')
      .eq('month', month)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    allocations = allocations.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  // 3. Fetch all registered users and all clients
  const [usersRes, clientsRes] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('clients').select('*')
  ]);

  if (usersRes.error) throw usersRes.error;
  if (clientsRes.error) throw clientsRes.error;
  
  const allUsers = usersRes.data;
  const allClients = clientsRes.data;

  // Fetch the effective exit months map
  const { byUserId } = await getEffectiveExitMonthsMap();

  const byMember = new Map<string, any>();

  // Pre-populate all registered users from database to ensure 100% visibility
  allUsers.forEach((u: any) => {
    if (!u.email) return;

    // Exclude if joining month is in the future relative to the target report month
    const joinMonth = u.joining_date ? u.joining_date.substring(0, 7) : '2025-11';
    if (joinMonth > month) return;

    // Exclude if exit date is set and their last active month is prior to this month
    if (u.exit_date) {
      const effExitMonth = byUserId[u.id] || '2025-10';
      if (effExitMonth < month) return;
    }

    // Safe read for salary (if column doesn't exist yet, fall back to 0)
    const sal = u.salary !== undefined ? Number(u.salary) : 0;

    byMember.set(u.id, {
      id: u.id,
      email: u.email,
      name: u.name || u.email.split('@')[0],
      salary: sal,
      allocations: {},
      totalHours: 0,
      isRegistered: true,
      firstAllocationMonth: firstMonthByUser[u.id] || null
    });
  });

  const clientObjs = new Map<string, any>();

  // Pre-populate all active clients so they appear as columns even with 0 hours
  allClients.forEach((c: any) => {
    const clientName = String(c.name || '').trim();
    if (!clientName) return;

    if (!clientObjs.has(clientName)) {
      clientObjs.set(clientName, {
        name: clientName,
        core: c.core || c.core_owner || '',
        budget: c.budget !== undefined ? Number(c.budget) : 0
      });
    }
  });

  // If grouping is enabled, add special group columns at the end
  if (groupBd) {
    clientObjs.set('Group BD', { name: 'Group BD', core: '', budget: 0 });
  }
  if (groupInternal) {
    clientObjs.set('Group Internal', { name: 'Group Internal', core: '', budget: 0 });
  }
  if (groupLeave) {
    clientObjs.set('Group LEAVE', { name: 'Group LEAVE', core: '', budget: 0 });
  }

  allocations.forEach((r: any) => {
    const u = r.users;
    if (!u) return;

    // Exclude if joining month is in the future
    const joinMonth = u.joining_date ? u.joining_date.substring(0, 7) : '2025-11';
    if (joinMonth > month) return;

    // Exclude if exit date is set and their last active month is prior to this month
    if (u.exit_date) {
      const effExitMonth = byUserId[u.id] || '2025-10';
      if (effExitMonth < month) return;
    }

    const firstMonth = firstMonthByUser[u.id] || null;
    if (!firstMonth || firstMonth > month) return;

    const clientName = String(r.clients?.name || 'Unknown Client').trim();
    const hours = Number(r.hours) || 0;
    if (!clientName) return;

    if (!clientObjs.has(clientName)) {
      const clientCore = r.clients?.core || r.clients?.core_owner || '';
      const clientBudget = r.clients?.budget !== undefined ? Number(r.clients.budget) : 0;

      clientObjs.set(clientName, {
        name: clientName,
        core: clientCore,
        budget: clientBudget
      });
    }

    if (!byMember.has(u.id)) {
      const sal = u.salary !== undefined ? Number(u.salary) : 0;
      byMember.set(u.id, {
        id: u.id,
        email: u.email,
        name: u.name || u.email.split('@')[0],
        salary: sal,
        allocations: {},
        totalHours: 0,
        isRegistered: true,
        firstAllocationMonth: firstMonth
      });
    }

    const m = byMember.get(u.id);
    m.allocations[clientName] = (m.allocations[clientName] || 0) + hours;
    m.totalHours += hours;

    // Accumulate to special group columns if enabled
    if (groupBd && isBdClient(clientName)) {
      m.allocations['Group BD'] = (m.allocations['Group BD'] || 0) + hours;
    }
    if (groupInternal && isInternalClient(clientName)) {
      m.allocations['Group Internal'] = (m.allocations['Group Internal'] || 0) + hours;
    }
    if (groupLeave && isLeaveClient(clientName)) {
      m.allocations['Group LEAVE'] = (m.allocations['Group LEAVE'] || 0) + hours;
    }
  });

  // Sort clients: cores grouped, alphabetical name. Grouped columns (Group BD, Group Internal, Group LEAVE) go to the absolute end.
  const clientsFull = Array.from(clientObjs.values()).sort((a, b) => {
    const isGroupedName = (name: string) => ['group bd', 'group internal', 'group leave'].includes(name.toLowerCase());
    const isGroupA = isGroupedName(a.name);
    const isGroupB = isGroupedName(b.name);

    if (isGroupA && !isGroupB) return 1;
    if (!isGroupA && isGroupB) return -1;
    if (isGroupA && isGroupB) {
      return a.name.localeCompare(b.name);
    }

    const cA = (a.core || '').toLowerCase();
    const cB = (b.core || '').toLowerCase();

    if (cA && !cB) return -1;
    if (!cA && cB) return 1;

    const coreDiff = cA.localeCompare(cB);
    if (coreDiff !== 0) return coreDiff;

    return a.name.localeCompare(b.name);
  });

  // Sort rows alphabetically by member name
  const rows = Array.from(byMember.values()).sort((a, b) => {
    const an = (a.name || a.email).toLowerCase();
    const bn = (b.name || b.email).toLowerCase();
    return an.localeCompare(bn);
  });

  return {
    month,
    clients: clientsFull,
    rows
  };
};

export const exportCoreMasterAllocationsToExcel = async (opts: {
  month: string;
  group_bd?: boolean;
  group_leave?: boolean;
  group_internal?: boolean;
  view_type?: 'hours' | 'percent' | 'salary';
}) => {
  const viewType = opts.view_type || 'hours';
  const data = await getCoreMasterAllocations(opts);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Master Allocations');

  // Set up Header Rows
  const header1 = ['Member', 'Email', 'Salary'];
  const header2 = ['Member', 'Email', 'Salary'];
  const budgetsRow = ['', '', 'Client Budget'];

  data.clients.forEach(c => {
    header1.push(c.core || '(Unassigned)');
    header2.push(c.name);
    budgetsRow.push(c.budget !== null && c.budget !== undefined ? c.budget : '');
  });

  worksheet.addRow(header1);
  worksheet.addRow(header2);
  worksheet.addRow(budgetsRow);

  let totalSalary = 0;
  let globalTotalHours = 0;
  const clientTotals: Record<string, { hours: number; sal: number }> = {};
  data.clients.forEach(c => clientTotals[c.name] = { hours: 0, sal: 0 });

  // Add Data Rows
  data.rows.forEach(r => {
    if (r.salary) totalSalary += Number(r.salary) || 0;
    if (r.totalHours) globalTotalHours += r.totalHours;

    const rowData = [r.name, r.email, r.salary || 0];

    data.clients.forEach(c => {
      const v = Number(r.allocations[c.name] || 0);

      clientTotals[c.name].hours += v;
      if (r.totalHours > 0 && r.salary > 0) {
        clientTotals[c.name].sal += (v / r.totalHours) * r.salary;
      }

      if (viewType === 'percent') {
        if (r.totalHours && r.totalHours > 0) {
          rowData.push(v / r.totalHours); // Fraction 0 to 1
        } else {
          rowData.push('');
        }
      } else if (viewType === 'salary') {
        if (r.totalHours && r.totalHours > 0 && r.salary > 0) {
          rowData.push((v / r.totalHours) * r.salary);
        } else {
          rowData.push('');
        }
      } else {
        rowData.push(v ? v : '');
      }
    });

    const addedRow = worksheet.addRow(rowData);

    // Highlight registered zero-allocation members in red
    if (r.totalHours === 0) {
      addedRow.getCell(1).font = { color: { argb: 'FFFF0000' }, bold: true };
    }
  });

  // Add Totals Row
  const totalRowData = ['TOTAL', '', totalSalary];
  data.clients.forEach(c => {
    const ct = clientTotals[c.name];
    if (viewType === 'percent') {
      const p = globalTotalHours > 0 ? (ct.hours / globalTotalHours) : 0;
      totalRowData.push(p);
    } else if (viewType === 'salary') {
      totalRowData.push(ct.sal);
    } else {
      totalRowData.push(ct.hours);
    }
  });
  const totalRow = worksheet.addRow(totalRowData);

  // Group / Merge Core vertical columns in Header 1
  if (header1.length > 4) {
    let startCol = 4;
    let currentColVal = header1[3];
    
    for (let c = 5; c <= header1.length + 1; c++) {
      const val = (c <= header1.length) ? header1[c-1] : '###END###'; 
      if (val !== currentColVal) {
        const numCols = (c - 1) - startCol + 1;
        if (numCols > 1) {
          worksheet.mergeCells(1, startCol, 1, c - 1);
        }
        worksheet.getCell(1, startCol).alignment = { horizontal: 'center', vertical: 'middle' };
        startCol = c;
        currentColVal = val;
      }
    }
  }

  // Row 1 & 2 styles (Headers)
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(2).font = { bold: true };
  
  // Row 3 (Budgets) style
  worksheet.getRow(3).font = { bold: true };
  for (let col = 4; col <= header1.length; col++) {
    const cell = worksheet.getCell(3, col);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFECFDF5' } // Soft emerald green
    };
    cell.numFmt = '"₹"#,##0.00';
  }

  // Format Salary Column & Allocations Columns
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 3) {
      // Salary Column Format
      const salCell = row.getCell(3);
      if (salCell.value) {
        salCell.numFmt = '"₹"#,##0.00';
      }

      // Allocations Columns
      for (let col = 4; col <= header1.length; col++) {
        const cell = row.getCell(col);
        if (cell.value !== '' && cell.value !== null) {
          if (viewType === 'percent') {
            cell.numFmt = '0.00%';
          } else if (viewType === 'salary') {
            cell.numFmt = '"₹"#,##0.00';
          } else {
            cell.numFmt = '0.00';
          }
        }
      }
    }
  });

  // Style Total row
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' }
    };
  });

  // Freeze Headers & Columns
  worksheet.views = [
    { state: 'frozen', xSplit: 3, ySplit: 3 }
  ];

  // Auto-resize columns
  worksheet.columns.forEach((column, i) => {
    let maxLength = 10;
    column.eachCell && column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      // Don't size based on merged header row 1 to avoid massive columns
      if (rowNumber === 1) return;
      const columnLength = cell.value ? String(cell.value).length : 0;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 3, 30);
  });

  return workbook;
};

// Admin updates for Salary
export const updateUserSalary = async (userId: string, salary: number) => {
  const { data, error } = await supabase
    .from('users')
    .update({ salary })
    .eq('id', userId)
    .select();
  if (error) throw error;
  return data[0];
};

// Admin updates for Client Budget & Core
export const updateClientBudgetAndCore = async (clientId: string, budget: number, core: string) => {
  const { data, error } = await supabase
    .from('clients')
    .update({ budget, core })
    .eq('id', clientId)
    .select();
  if (error) throw error;
  return data[0];
};
