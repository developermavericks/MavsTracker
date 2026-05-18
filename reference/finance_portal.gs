/***** ==== CONFIG ==== *****/
const SHEET_NAME        = 'Users';
const ROLES_SHEET       = 'roles';
const ALLOC_M_SHEET     = 'allocations_monthly';
const ALLOC_W_SHEET     = 'allocations_weekly';
const CLIENTS_SHEET     = 'clients';

const ALLOWED_DOMAIN = 'themavericksindia.com';
const TZ             = 'Asia/Kolkata';

// The main database for allocations/users
const SPREADSHEET_ID_FALLBACK = '1bsDfER0b3z3Quw3tfHsDAx2NqrtbTwPfwrHDLtmgZ5I';

// The secure finance database
const FINANCE_DB_ID = '1KAzxfsgRPFEpu-FNicPAP3DniP4ZDIniLHhdz-wwDtM'; 

/***** ==== APP SHELL ==== *****/
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Time Allocation (Finance)')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/***** ==== DB HELPERS ==== *****/
function getDbId_() {
  const id = PropertiesService.getScriptProperties().getProperty('ALLOC_DB_ID') || SPREADSHEET_ID_FALLBACK;
  if (!id) throw new Error('DB not configured. Set Script Property ALLOC_DB_ID.');
  return id;
}
function open_() { return SpreadsheetApp.openById(getDbId_()); }

// Read-only access to needed sheets
function getUsersSheet_() { return open_().getSheetByName(SHEET_NAME); }
function getRolesSheet_() { return open_().getSheetByName(ROLES_SHEET); }
function getAllocWeeklySheet_() { return open_().getSheetByName(ALLOC_W_SHEET); }
function getClientsSheet_() { return open_().getSheetByName(CLIENTS_SHEET); }

function getAllUsers_() {
  const sh = getUsersSheet_();
  if (!sh) return [];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const vals = sh.getRange(2, 1, last - 1, 3).getValues();
  const users = [];
  for (const row of vals) {
    const email = String(row[1] || '').toLowerCase();
    const name = String(row[2] || '').trim();
    if (email) users.push({ email, name });
  }
  return users;
}

/***** ==== UTILITIES ==== *****/
function nowIsoIST_() {
  const d = new Date();
  try {
    return Utilities.formatDate(d, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
  } catch (_e) {
    return Utilities.formatDate(d, TZ, "yyyy-MM-dd'T'HH:mm:ssZ");
  }
}
function toYYYYMM_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM');
  const s = String(v || '').trim();
  const m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2);
  return s;
}

function toYYYYMMFromISODate_(isoDateStr) {
  if (!isoDateStr) return '';
  if (isoDateStr instanceof Date) return Utilities.formatDate(isoDateStr, TZ, 'yyyy-MM');
  const s = String(isoDateStr).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${('0'+m[2]).slice(-2)}`;
  return toYYYYMM_(s);
}

function deriveRowMonthFromWeekly_(row, colMap) {
  const sd = row[colMap.start_date];
  const ed = row[colMap.end_date];
  let mm = toYYYYMMFromISODate_(sd);
  if (!mm) mm = toYYYYMMFromISODate_(ed);
  if (!mm) mm = toYYYYMM_(row[colMap.month]);
  return mm;
}

function listRecentMonthIsos_(monthsBack = 6) {
  const n = Math.max(1, Number(monthsBack) || 6);
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(Utilities.formatDate(d, TZ, 'yyyy-MM'));
  }
  return out; 
}

/***** ==== IDENTITY & AUTH ==== *****/
function getGoogleUser_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('No active user.');
  if (ALLOWED_DOMAIN && !email.endsWith('@' + ALLOWED_DOMAIN.toLowerCase()))
    throw new Error('Only ' + ALLOWED_DOMAIN + ' accounts are allowed.');
    
  const sh = getUsersSheet_();
  if (!sh) throw new Error("Users sheet missing in DB.");
  const idx = findUserRow_(sh, '', email);
  let name = '', picture = '', sub = '';
  if (idx !== -1) {
    const row = sh.getRange(idx, 1, 1, 4).getValues()[0];
    sub = String(row[0] || '');
    name = String(row[2] || '');
    picture = String(row[3] || '');
  }
  if (!sub) sub = 'email:' + email;
  return { sub, email, name, picture, email_verified: true };
}

function findUserRow_(sh, sub, email) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const vals = sh.getRange(2, 1, last - 1, 2).getValues();
  const wantSub = String(sub || '');
  const wantEmail = String(email || '').toLowerCase();
  for (let i = 0; i < vals.length; i++) {
    const rSub = String(vals[i][0] || '');
    const rEmail = String(vals[i][1] || '').toLowerCase();
    if (wantSub && rSub === wantSub) return i + 2;
    if (wantEmail && rEmail === wantEmail) return i + 2;
  }
  return -1;
}

function getUserRoles_(claims) {
  const sh = getRolesSheet_();
  if (!sh) return [];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const data = sh.getRange(2,1,last-1,3).getValues();
  const wantSub = claims.sub || '';
  const wantEmail = (claims.email || '').toLowerCase();
  const roles = new Set();
  
  for (const [rSub, rEmail, rRole] of data) {
    const match = (rSub && String(rSub) === wantSub) || (rEmail && String(rEmail).toLowerCase() === wantEmail);
    if (match && rRole) {
      String(rRole).split(',').forEach(part => {
        const nr = normalizeRole_(part);
        if (nr) roles.add(nr);
      });
    }
  }
  return Array.from(roles);
}

function normalizeRole_(r) {
  const x = String(r || '').trim().toLowerCase();
  if (['core team','core_team','core'].includes(x)) return 'core';
  if (['manager','managers'].includes(x)) return 'manager';
  if (['team','member','staff'].includes(x)) return 'team';
  if (['finance'].includes(x)) return 'finance'; // Explicitly support finance
  return x;
}

function toUser_(claims, roles) {
  const finalRoles = roles && roles.length ? roles : ['team'];
  // Set primary role. If finance exists, it overrides others for this app context.
  let primary = 'team';
  if (finalRoles.includes('finance')) primary = 'finance';
  else if (finalRoles.includes('core')) primary = 'core';
  else if (finalRoles.includes('manager')) primary = 'manager';

  return {
    sub: claims.sub,
    email: claims.email || '',
    name: claims.name || '',
    picture: claims.picture || '',
    roles: finalRoles,
    primaryRole: primary
  };
}

function getSession() {
  const c = getGoogleUser_();
  const roles = getUserRoles_(c);
  const u = toUser_(c, roles);
  
  // Strict check for Finance usage
  if (u.email !== 'satyam.singh@themavericksindia.com' && !u.roles.includes('finance')) {
      return { status: 'DENIED', user: u, message: 'You do not have access to the Finance Application.' };
  }
  return { status: 'OK', user: u };
}

// Minimal login needed for shell
function login() {
  const sess = getSession();
  if (sess.status === 'DENIED') throw new Error(sess.message);
  return sess.user;
}

function requireFinanceAccess_() {
   const c = getGoogleUser_();
   const roles = getUserRoles_(c);
   if (c.email !== 'satyam.singh@themavericksindia.com' && !roles.includes('finance')) {
       throw new Error('Access denied. Finance department only.');
   }
   return { claims: c, roles };
}

/***** ==== FINANCE DATA FETCHING ==== *****/

/**
 * Fetches salary by email and budgets by client from the restricted sheet.
 * Format returned:
 * {
 *    salaries: { "target.email@mavericks...": 50000, ... },
 *    budgets:  { "ClientA": 100000, ... }
 * }
 */
function getRestrictedFinanceData_() {
  // Ensure we are allowed to read this. (The script executes as the active user, so they must have access to the file).
  const salaries = {};
  const budgets = {};

  try {
    const ss = SpreadsheetApp.openById(FINANCE_DB_ID);
    
    // Read Salary Sheet
    const salSheet = ss.getSheetByName('salary');
    if (salSheet) {
      const salData = salSheet.getDataRange().getValues();
      if (salData.length > 1) {
         const head = salData[0].map(h => String(h).toLowerCase().trim());
         // more robust fuzzy match for headers
         const emailCol = head.findIndex(h => h === 'email' || h === 'mail' || h.includes('mail'));
         const salCol = head.findIndex(h => h === 'salary' || h.includes('salary'));
         
         if (emailCol > -1 && salCol > -1) {
            for (let i = 1; i < salData.length; i++) {
               const rmData = String(salData[i][emailCol]).toLowerCase().trim();
               const rhData = Number(salData[i][salCol]) || 0;
               if (rmData) salaries[rmData] = rhData;
            }
         }
      }
    }

    // Read Budget Sheet
    const budSheet = ss.getSheetByName('client_budget');
    if (budSheet) {
      const budData = budSheet.getDataRange().getValues();
      if (budData.length > 1) {
         const head = budData[0].map(h => String(h).toLowerCase().trim());
         const clientCol = head.findIndex(h => h === 'client' || h === 'clients' || h.includes('client'));
         const budCol = head.findIndex(h => h === 'budget' || h === 'client_budget' || h.includes('budget'));
         
         if (clientCol > -1 && budCol > -1) {
            for (let i = 1; i < budData.length; i++) {
               const rcData = String(budData[i][clientCol]).trim();
               const rbData = Number(budData[i][budCol]) || 0;
               if (rcData) budgets[rcData] = rbData;
            }
         }
      }
    }
    
  } catch (e) {
    Logger.log("Failed to fetch finance data. User might not have access to sheet. " + e.message);
    // If the active user lacks access to the finance sheet, we gracefully return empty maps, 
    // or let it fail if the requirement is strict.
  }
  
  return { salaries, budgets };
}


/***** ==== MASTER ALLOCATIONS FETCH ==== *****/

function listAvailableMonths() {
    return listRecentMonthIsos_(6);
}

function normalizeClientForMaster_(client) {
  const s = String(client || '').trim();
  const low = s.toLowerCase();
  if (
    low === 'bd' ||
    low.startsWith('bd ') ||
    low.startsWith('bd-') ||
    low.startsWith('bd -') ||
    low.startsWith('bd/') ||
    low.startsWith('bd –') ||
    low.startsWith('bd —')
  ) return 'BD';
  return s;
}

function getClientsCoreMap_() {
  const sh = getClientsSheet_();
  if (!sh) return new Map();
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return new Map();

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(h => String(h).toLowerCase().trim());
  const coreIdx = headers.indexOf('core'); 
  const clientIdx = headers.indexOf('client');

  if (coreIdx === -1 || clientIdx === -1) return new Map();

  const map = new Map();
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const client = String(row[clientIdx] || '').trim();
    const core = String(row[coreIdx] || '').trim();
    if (client) {
      map.set(client.toLowerCase(), core);
    }
  }
  return map;
}

function getFirstAllocationMonthByEmail_() {
  const firstMonthByEmail = {};

  const shW = getAllocWeeklySheet_();
  if (!shW || shW.getLastRow() < 2) return firstMonthByEmail;

  const header = shW.getRange(1, 1, 1, shW.getLastColumn()).getValues()[0];
  const colMap = header.reduce((acc, h, i) => {
    acc[String(h).trim()] = i;
    return acc;
  }, {});

  if (colMap.email === undefined || colMap.month === undefined) {
    return firstMonthByEmail;
  }

  const valuesW = shW.getRange(2, 1, shW.getLastRow() - 1, shW.getLastColumn()).getValues();

  valuesW.forEach(row => {
    const email = String(row[colMap.email] || '').toLowerCase().trim();
    const rowMonth = deriveRowMonthFromWeekly_(row, colMap);

    if (!email || !rowMonth) return;

    // YYYY-MM string comparison works correctly.
    // This keeps the earliest allocation month.
    if (!firstMonthByEmail[email] || rowMonth < firstMonthByEmail[email]) {
      firstMonthByEmail[email] = rowMonth;
    }
  });

  return firstMonthByEmail;
}

function getCoreMasterAllocations(opts) {
  requireFinanceAccess_();

  const month = String(opts && opts.month || '').trim();
  const groupBd = (opts && 'group_bd' in opts) ? !!opts.group_bd : true;
  const groupLeave = (opts && 'group_leave' in opts) ? !!opts.group_leave : true;
  const groupInternal = (opts && 'group_internal' in opts) ? !!opts.group_internal : true;

  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Month must be YYYY-MM.');

  const coreMap = getClientsCoreMap_();
  const financeData = getRestrictedFinanceData_();

  // First allocation month for every email across the whole weekly allocation sheet.
  // This becomes the real join month.
  const firstMonthByEmail = getFirstAllocationMonthByEmail_();

  // Read Weekly Actuals from main DB for selected month only.
  const shW = getAllocWeeklySheet_();
  const allocRows = [];

  if (shW && shW.getLastRow() >= 2) {
    const header = shW.getRange(1, 1, 1, shW.getLastColumn()).getValues()[0];
    const colMap = header.reduce((acc, h, i) => {
      acc[String(h).trim()] = i;
      return acc;
    }, {});

    const valuesW = shW.getRange(2, 1, shW.getLastRow() - 1, shW.getLastColumn()).getValues();

    for (const row of valuesW) {
      if (deriveRowMonthFromWeekly_(row, colMap) === month) {
        allocRows.push({
          email: String(row[colMap.email] || '').toLowerCase().trim(),
          name: row[colMap.name],
          client: row[colMap.client],
          hours: Number(row[colMap.hours]) || 0
        });
      }
    }
  }

  const byMember = new Map();

  // Registered users from Users sheet.
  const allUsers = getAllUsers_();
  const registeredEmails = new Set(allUsers.map(u => String(u.email || '').toLowerCase().trim()));

  /*
    Pre-populate registered users only if:
    1. They have allocation data at least once.
    2. Their first allocation month is <= selected month.

    This prevents people from showing before they actually joined.
  */
  allUsers.forEach(u => {
    const email = String(u.email || '').toLowerCase().trim();
    if (!email) return;

    const firstAllocationMonth = firstMonthByEmail[email] || null;

    // If user has never submitted allocation data, do not show in finance view.
    if (!firstAllocationMonth) return;

    // If selected month is before their first allocation month, do not show.
    if (firstAllocationMonth > month) return;

    const sal = financeData.salaries[email] || null;

    byMember.set(email, {
      email: email,
      name: u.name,
      salary: sal,
      allocations: {},
      totalHours: 0,
      isRegistered: true,
      firstAllocationMonth: firstAllocationMonth
    });
  });

  const clientSet = new Set();
  const clientObjs = new Map();

  allocRows.forEach(r => {
    const email = String(r.email || '').toLowerCase().trim();
    if (!email) return;

    // Do not show or calculate unregistered users at all.
    if (!registeredEmails.has(email)) return;

    const firstAllocationMonth = firstMonthByEmail[email] || null;

    // If no first allocation month exists, skip.
    if (!firstAllocationMonth) return;

    // Hide users before their first allocation month.
    if (firstAllocationMonth > month) return;

    let client = '';
    if (groupBd) {
      client = normalizeClientForMaster_(r.client);
    } else {
      client = String(r.client || '').trim();
    }

    if (groupLeave && ['leave', 'personal commitments'].includes(client.toLowerCase())) {
      client = 'LEAVE';
    }

    const cLow = client.toLowerCase();
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

    if (groupInternal && internalGroupList.includes(cLow)) {
      client = 'Group Internal';
    }

    const hours = Number(r.hours) || 0;
    if (!client) return;

    clientSet.add(client);

    if (!clientObjs.has(client)) {
      let core = coreMap.get(client.toLowerCase()) || '';
      if (groupBd && client === 'BD') core = '';

      const matchingBudgetKey = Object.keys(financeData.budgets).find(k => {
        return String(k).toLowerCase() === client.toLowerCase();
      });

      const bud = matchingBudgetKey ? financeData.budgets[matchingBudgetKey] : null;

      clientObjs.set(client, {
        name: client,
        core: core,
        budget: bud
      });
    }

    if (!byMember.has(email)) {
      const sal = financeData.salaries[email] || null;

      byMember.set(email, {
        email: email,
        name: r.name,
        salary: sal,
        allocations: {},
        totalHours: 0,
        isRegistered: true,
        firstAllocationMonth: firstAllocationMonth
      });
    }

    const m = byMember.get(email);
    m.allocations[client] = (Number(m.allocations[client]) || 0) + hours;
    m.totalHours += hours;
  });

  let clientsFull = Array.from(clientObjs.values());

  clientsFull.sort((a, b) => {
    const cA = (a.core || '').toLowerCase();
    const cB = (b.core || '').toLowerCase();

    if (cA && !cB) return -1;
    if (!cA && cB) return 1;

    const coreDiff = cA.localeCompare(cB);
    if (coreDiff !== 0) return coreDiff;

    return a.name.localeCompare(b.name);
  });

  const rows = Array.from(byMember.values()).sort((a, b) => {
    const an = (a.name || a.email).toLowerCase();
    const bn = (b.name || b.email).toLowerCase();
    return an.localeCompare(bn);
  });

  return {
    month: month,
    clients: clientsFull,
    rows: rows
  };
}

/***** ==== EXCEL EXPORT MASTER ==== *****/
function exportCoreMasterAllocationsXlsx(opts) {
  requireFinanceAccess_();

  const data = getCoreMasterAllocations(opts);
  const month = data.month;
  const groupBd = (opts && 'group_bd' in opts) ? !!opts.group_bd : true;
  const groupLeave = (opts && 'group_leave' in opts) ? !!opts.group_leave : true;
  const groupInternal = (opts && 'group_internal' in opts) ? !!opts.group_internal : true;
  const viewType = (opts && opts.view_type) ? String(opts.view_type) : 'hours';

  const suffix = (!groupBd || !groupLeave || !groupInternal) ? ' (Detailed)' : '';
  const suffixView = (viewType === 'percent') ? ' (Percentage)' : (viewType === 'salary') ? ' (Allocated Salary)' : ' (Hours)';
  const tmp = SpreadsheetApp.create(`Finance Master Allocations ${month}${suffix}${suffixView}`);
  const sh = tmp.getSheets()[0];
  sh.setName('Master');

  // Header 1: "Member", "Email", "Salary", "Core A", "Core A", ...
  // Header 2: "Member", "Email", "Salary", "Client 1", "Client 2", ...
  // Header 3 (NEW BUD ROW): "", "", "", 100000, 50000, ...

  const header1 = ['Member', 'Email', 'Salary'];
  const header2 = ['Member', 'Email', 'Salary'];
  const budgetsRow = ['', '', 'Client Budget'];

  data.clients.forEach(c => {
    header1.push(c.core || '(Unassigned)');
    header2.push(c.name);
    budgetsRow.push(c.budget !== null && c.budget !== undefined ? c.budget : '');
  });

  const values = [header1, header2, budgetsRow];

  // For tracking the totals row
  let totalSalary = 0;
  let globalTotalHours = 0;
  const clientTotals = {};
  data.clients.forEach(c => clientTotals[c.name] = { hours: 0, sal: 0 });

  data.rows.forEach(r => {
    if (r.salary) totalSalary += Number(r.salary) || 0;
    if (r.totalHours) globalTotalHours += r.totalHours;

    const memberLabel = (r.name || r.email);
    const row = [memberLabel, r.email, r.salary !== null && r.salary !== undefined ? r.salary : ''];

    data.clients.forEach(c => {
      const v = Number((r.allocations && r.allocations[c.name]) || 0);

      clientTotals[c.name].hours += v;
      if (r.totalHours > 0 && r.salary > 0) {
          clientTotals[c.name].sal += (v / r.totalHours) * r.salary;
      }

      if (viewType === 'percent') {
         if (r.totalHours && r.totalHours > 0) {
            const p = v / r.totalHours; // Excel percentages are fractions from 0 to 1
            row.push(p > 0 ? p : '');
         } else {
            row.push('');
         }
      } else if (viewType === 'salary') {
         if (r.totalHours && r.totalHours > 0 && r.salary > 0) {
            const allocSal = (v / r.totalHours) * r.salary;
            row.push(allocSal > 0 ? allocSal : '');
         } else {
            row.push('');
         }
      } else {
         row.push(v ? v : '');
      }
    });

    values.push(row);
  });

  // Calculate Total Row
  const totalRow = ['TOTAL', '', totalSalary > 0 ? totalSalary : ''];
  data.clients.forEach(c => {
      const ct = clientTotals[c.name];
      if (viewType === 'percent') {
          const p = globalTotalHours > 0 ? (ct.hours / globalTotalHours) : 0;
          totalRow.push(p > 0 ? p : 0);
      } else if (viewType === 'salary') {
          totalRow.push(ct.sal > 0 ? ct.sal : 0);
      } else {
          totalRow.push(ct.hours > 0 ? ct.hours : 0);
      }
  });
  values.push(totalRow);

  sh.getRange(1, 1, values.length, values[0].length).setValues(values);

  // Group Core Columns (Row 1). Starts from Column 4 because 1=Member, 2=Email, 3=Salary
  if (header1.length > 4) {
    let startCol = 4;
    let currentColVal = header1[3];
    
    for (let c = 5; c <= header1.length + 1; c++) {
      const val = (c <= header1.length) ? header1[c-1] : '###END###'; 
      if (val !== currentColVal) {
        const numCols = (c - 1) - startCol + 1;
        if (numCols > 1) {
          sh.getRange(1, startCol, 1, numCols).merge().setHorizontalAlignment('center');
        } else {
          sh.getRange(1, startCol).setHorizontalAlignment('center');
        }
        startCol = c;
        currentColVal = val;
      }
    }
  }

  // Row 1 & 2 styles
  sh.getRange(1, 1, 2, values[0].length).setFontWeight('bold').setVerticalAlignment('middle');
  // Row 3 (Budgets) style
  sh.getRange(3, 1, 1, values[0].length).setFontWeight('bold');
  if (values[0].length > 3) {
      // Format budget numbers
      sh.getRange(3, 4, 1, values[0].length - 3).setNumberFormat('"₹"#,##0.00'); 
  }
  
  // Format Data Rows
  if (values.length > 3 && values[0].length > 3) {
      // Salary Column Format
      sh.getRange(4, 3, values.length - 3, 1).setNumberFormat('"₹"#,##0.00');
      // Allocations Format
      if (viewType === 'percent') {
          sh.getRange(4, 4, values.length - 3, values[0].length - 3).setNumberFormat('0.00%');
      } else if (viewType === 'salary') {
          sh.getRange(4, 4, values.length - 3, values[0].length - 3).setNumberFormat('"₹"#,##0.00');
      } else {
          sh.getRange(4, 4, values.length - 3, values[0].length - 3).setNumberFormat('0.00');
      }
  }

  // Highlight zero-allocation members in red and unregistered members in purple
// Highlight registered zero-allocation members in red.
// Unregistered users are already removed from getCoreMasterAllocations().
data.rows.forEach((r, index) => {
  if (r.totalHours === 0) {
    sh.getRange(4 + index, 1).setFontColor('red');
  }
});

  // Style Total row
  const lastRowIdx = values.length; 
  sh.getRange(lastRowIdx, 1, 1, values[0].length).setFontWeight('bold').setBackground('#f9fafb');
  sh.getRange(lastRowIdx, 1).setFontColor('black');

  // Formatting freezes
  sh.setFrozenRows(3); // Headers + Budgets row
  sh.setFrozenColumns(3); // Member + Email + Salary columns
  sh.autoResizeColumns(1, values[0].length);

  const exportUrl = `https://docs.google.com/spreadsheets/d/${tmp.getId()}/export?format=xlsx`;
  const blob = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  }).getBlob().setName(`Finance_Allocations_${month}.xlsx`);

  try { DriveApp.getFileById(tmp.getId()).setTrashed(true); } catch (_e) {}

  return {
    filename: blob.getName(),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64: Utilities.base64Encode(blob.getBytes())
  };
}
