/***** ==== CONFIG ==== *****/
const SHEET_NAME      = 'Users';
const ROLES_SHEET     = 'roles';
const TEAMS_SHEET     = 'teams';
const ALLOC_M_SHEET   = 'allocations_monthly';
const ALLOC_W_SHEET   = 'allocations_weekly'; // weekly store for actuals
const CLIENTS_SHEET   = 'clients';

const ALLOWED_DOMAIN = 'themavericksindia.com';
const TZ             = 'Asia/Kolkata';
const MONTHLY_CAP_HOURS = 160;

const SPREADSHEET_ID_FALLBACK = '1bsDfER0b3z3Quw3tfHsDAx2NqrtbTwPfwrHDLtmgZ5I';

/***** ==== APP SHELL ==== *****/
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Time Allocation')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/***** ==== DB & SHEET HELPERS ==== *****/
function getDbId_() {
  const id = PropertiesService.getScriptProperties().getProperty('ALLOC_DB_ID') || SPREADSHEET_ID_FALLBACK;
  if (!id) throw new Error('DB not configured. Set Script Property ALLOC_DB_ID.');
  return id;
}
function open_() { return SpreadsheetApp.openById(getDbId_()); }

function getAllocWeeklySheet_() {
  const ss = open_();
  let sh = ss.getSheetByName(ALLOC_W_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ALLOC_W_SHEET);
    sh.appendRow(['id', 'month', 'sub', 'email', 'name', 'client', 'category', 'hours', 'notes', 'created_at', 'updated_at', 'start_date', 'end_date', 'week_code']);
  } else {
    const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    let nextCol = header.length + 1;
    if (!header.includes('start_date')) sh.getRange(1, nextCol++).setValue('start_date');
    const header2 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    nextCol = header2.length + 1;
    if (!header2.includes('end_date')) sh.getRange(1, nextCol++).setValue('end_date');
    const header3 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    nextCol = header3.length + 1;
    if (!header3.includes('week_code')) sh.getRange(1, nextCol).setValue('week_code');
  }
  return sh;
}

function getUsersSheet_() {
  const ss = open_();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['sub','email','name','picture','created_at','last_login','email_verified','terms_accepted_at']);
  }
  return sh;
}
function getRolesSheet_() {
  const ss = open_();
  let sh = ss.getSheetByName(ROLES_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ROLES_SHEET);
    sh.appendRow(['sub','email','role']);
  }
  return sh;
}
function getTeamsSheet_() {
  const ss = open_();
  let sh = ss.getSheetByName(TEAMS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(TEAMS_SHEET);
    sh.appendRow(['manager_sub','manager_email','member_sub','member_email']);
  }
  return sh;
}
function getAllocMonthlySheet_() {
  const ss = open_();
  let sh = ss.getSheetByName(ALLOC_M_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ALLOC_M_SHEET);
    sh.appendRow(['id','month','kind','sub','email','name','client','category','hours','notes','created_at','updated_at']);
  }
  return sh;
}
function getClientsSheet_() {
  const ss = open_();
  let sh = ss.getSheetByName(CLIENTS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CLIENTS_SHEET);
    sh.appendRow(['client','active']);
  }
  return sh;
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
function isoMonthIST_(d = new Date()) { return Utilities.formatDate(d, TZ, 'yyyy-MM'); }
function isoPrevMonthIST_() {
  const d = new Date();
  return Utilities.formatDate(new Date(d.getFullYear(), d.getMonth()-1, 1), TZ, 'yyyy-MM');
}
function recentMonthsIST_(count) {
  const n = Math.max(1, Number(count) || 6);
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(Utilities.formatDate(d, TZ, 'yyyy-MM'));
  }
  return out; // newest -> oldest
}

// Keeps name so you don’t have to refactor callers.
// Now means “within last 6 months”.
function allowCurrOrPrevMonth_(m){
  const mm = toYYYYMM_(m);
  return recentMonthsIST_(6).includes(mm);
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

function formatDateRangeLabel_(startStr, endStr) {
  try {
    const fmt = (iso) => {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return Utilities.formatDate(dt, TZ, 'MMM d');
    };
    return `${fmt(startStr)} – ${fmt(endStr)}`;
  } catch (e) {
    return '(Invalid Date)';
  }
}

function weeksOfMonthIST_(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const [Y, M] = month.split('-').map(Number);
  const lastDay = new Date(Y, M, 0).getDate();
  const out = [];
  let day = 1, wk = 1;
  while (day <= lastDay) {
    const s = new Date(Y, M - 1, day);
    const e = new Date(Y, M - 1, Math.min(day + 6, lastDay));
    out.push({
      weekNum: wk,
      code: `${month}-Wk${wk}`,
      start: Utilities.formatDate(s, TZ, 'yyyy-MM-dd'),
      end: Utilities.formatDate(e, TZ, 'yyyy-MM-dd'),
    });
    day += 7; wk += 1;
  }
  return out;
}
function labelForWeek_(month, weekCode) {
  const weeks = weeksOfMonthIST_(month);
  const found = weeks.find(w => w.code === weekCode);
  if (!found) return '';
  const fmt = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    return Utilities.formatDate(dt, TZ, 'MMM d');
  };
  return `Week ${found.weekNum} (${fmt(found.start)} – ${fmt(found.end)})`;
}

/***** ==== IDENTITY & AUTH ==== *****/
function getGoogleUser_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email) throw new Error('No active user.');
  if (ALLOWED_DOMAIN && !email.endsWith('@' + ALLOWED_DOMAIN.toLowerCase()))
    throw new Error('Only ' + ALLOWED_DOMAIN + ' accounts are allowed.');
  const sh = getUsersSheet_();
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
function pickPrimaryRole_(roles) {
  const set = new Set((roles || []).map(r => String(r).toLowerCase().trim()));
  if (set.has('core')) return 'core';
  if (set.has('manager')) return 'manager';
  return 'team';
}
function normalizeRole_(r) {
  const x = String(r || '').trim().toLowerCase();
  if (['core team','core_team','core'].includes(x)) return 'core';
  if (['manager','managers'].includes(x)) return 'manager';
  if (['team','member','staff'].includes(x)) return 'team';
  return x;
}
function toUser_(claims, roles) {
  const finalRoles = roles && roles.length ? roles : ['team'];
  return {
    sub: claims.sub,
    email: claims.email || '',
    name: claims.name || '',
    picture: claims.picture || '',
    roles: finalRoles,
    primaryRole: pickPrimaryRole_(finalRoles)
  };
}
function getSession() {
  const c = getGoogleUser_();
  const sh = getUsersSheet_();
  const idx = findUserRow_(sh, c.sub, c.email);
  if (idx === -1) {
    return {
      status: 'NO_ACCOUNT',
      user: { email: c.email, name: c.name || c.email.split('@')[0], picture: c.picture }
    };
  }
  sh.getRange(idx, 6).setValue(nowIsoIST_());
  const roles = getUserRoles_(c);
  return { status: 'OK', user: toUser_(c, roles) };
}
function signUp(termsAccepted) {
  const c = getGoogleUser_();
  if (!c.email_verified) throw new Error('Please verify your Google email.');
  if (!termsAccepted) throw new Error('You must accept the Terms.');
  const sh = getUsersSheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (findUserRow_(sh, c.sub, c.email) !== -1) throw new Error('An account already exists.');
    const nowIso = nowIsoIST_();
    const name = c.name || c.email.split('@')[0];
    sh.appendRow([ c.sub, c.email, name, c.picture, nowIso, nowIso, true, nowIso ]);
    const roles = getUserRoles_(c);
    return toUser_(Object.assign({}, c, { name }), roles);
  } finally {
    lock.releaseLock();
  }
}
function login() {
  const c = getGoogleUser_();
  const sh = getUsersSheet_();
  const idx = findUserRow_(sh, c.sub, c.email);
  if (idx === -1) throw new Error('No account found. Please sign up first.');
  sh.getRange(idx, 6).setValue(nowIsoIST_());
  const roles = getUserRoles_(c);
  return toUser_(c, roles);
}
function requireAnyRole_(allowed) {
  const c = getGoogleUser_();
  const roles = getUserRoles_(c);
  const p = pickPrimaryRole_(roles);
  if (!allowed.includes(p)) throw new Error('Access denied.');
  return { claims: c, roles, primary: p };
}

/***** ==== CLIENT UTIL (AUTO-APPEND) ==== */
/** Adds a client to Clients sheet if missing. No role check; safe for import flows. */
function ensureClientExists_(name) {
  const n = String(name || '').trim();
  if (!n) return false;

  const sh = getClientsSheet_();
  const last = sh.getLastRow();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    let existing = [];
    if (last >= 2) {
      existing = sh
        .getRange(2, 1, last - 1, 1)
        .getValues()
        .flat()
        .map(v => String(v || '').trim().toLowerCase());
    }

    if (existing.includes(n.toLowerCase())) {
      return false;
    }

    sh.appendRow([n, true]);
    return true;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Lightweight client add used by the calendar-import BD flow.
 * - No role check (anyone can create a BD client from the UI).
 * - Returns { ok: true, created: boolean }.
 */
function addClientAuto(name) {
  const created = ensureClientExists_(name);
  return {
    ok: true,
    created: !!created
  };
}

/***** ==== CORE APP LOGIC ==== *****/

function addMonthlyAllocation(a){ 
  const c = getGoogleUser_(); 
  const { month, kind, client, category, hours, notes } = a; 
  if (!/^\d{4}-\d{2}$/.test(month) || kind !== 'projected' || !client || !(hours > 0)) {
    throw new Error('Invalid projected data.');
  }
  if (!allowCurrOrPrevMonth_(month)) {
    throw new Error('Projected entries allowed only for current or previous month.');
  }

  // auto-append client to Clients sheet
  ensureClientExists_(client);
  
  const sh = getAllocMonthlySheet_(); 
  const id = Utilities.getUuid(); 
  const now = nowIsoIST_(); 
  sh.appendRow([ id, month, kind, c.sub, c.email, c.name, client, category, hours, notes, now, now ]); 
  return { id };
}

function checkForOverlappingAllocations(start_date, end_date, client, notes) {
  const c = getGoogleUser_();
  const meEmail = (c.email || '').toLowerCase();
  
  const sh = getAllocWeeklySheet_();
  const last = sh.getLastRow();
  if (last < 2) return { hasOverlap: false, existingEntries: [] };
  
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const colMap = header.reduce((acc, h, i) => ({...acc, [h]: i}), {});
  const vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  
  const overlappingEntries = [];
  const newStart = new Date(start_date);
  const newEnd = new Date(end_date);
  
  for (const row of vals) {
    const rowSub = row[colMap.sub];
    const rowEmail = (row[colMap.email] || '').toLowerCase();
    const rowStart = new Date(row[colMap.start_date]);
    const rowEnd = new Date(row[colMap.end_date]);
    const rowClient = row[colMap.client];
    const rowHours = Number(row[colMap.hours]) || 0;
    const rowNotes = row[colMap.notes] || '';
    
    if ((rowEmail === meEmail || String(rowSub) === String(c.sub)) &&
        rowStart <= newEnd && rowEnd >= newStart) {
      const isSameEvent = rowNotes === notes && rowClient === client;
      overlappingEntries.push({
        start_date: Utilities.formatDate(rowStart, TZ, 'yyyy-MM-dd'),
        end_date: Utilities.formatDate(rowEnd, TZ, 'yyyy-MM-dd'),
        client: rowClient,
        hours: rowHours,
        notes: rowNotes,
        sameClient: rowClient === client,
        sameEvent: isSameEvent
      });
    }
  }
  
  return {
    hasOverlap: overlappingEntries.length > 0,
    existingEntries: overlappingEntries,
    hasBlockingOverlap: overlappingEntries.some(entry => entry.sameEvent)
  };
}

/**
 * Overlap behavior (weekly):
 * - True duplicates (same client + same notes in overlapping period): ALWAYS block (even if force=true)
 * - Other overlaps: warn once unless force=true (useful for batch saves)
 */
function addWeeklyAllocation(payload) {
  const c = getGoogleUser_();
  const { month, start_date, end_date, client, category, hours, notes, force = false } = payload;

  if (!/^\d{4}-\d{2}$/.test(month) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(start_date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end_date) ||
      !client || !(Number(hours) > 0)) {
    throw new Error('Invalid weekly allocation data provided.');
  }
  if (!allowCurrOrPrevMonth_(month)) {
    throw new Error('Weekly allocations are allowed only for current or previous month.');
  }

  // auto-append client to Clients sheet
  ensureClientExists_(client);

  const overlapCheck = checkForOverlappingAllocations(start_date, end_date, client, notes);

  if (overlapCheck.hasBlockingOverlap) {
    const sameClientOverlap = overlapCheck.existingEntries.find(entry => entry.sameEvent);
    const range = sameClientOverlap ? ` (${sameClientOverlap.start_date} to ${sameClientOverlap.end_date})` : '';
    throw new Error(
      `WARNING: You already have an allocation for the same client and event "${notes}" with client "${client}" during this time period${range}. Please edit the existing entry instead of creating a new one.`
    );
  }

  if (!force && overlapCheck.hasOverlap) {
    const overlapDetails = overlapCheck.existingEntries.map(entry => 
      `• ${entry.client}: ${entry.start_date} to ${entry.end_date} (${entry.hours}h) - "${entry.notes}"`
    ).join('\n');

    throw new Error(
      `WARNING: You already have allocations during this period:\n${overlapDetails}\n\nIf this is intentional, choose "Add Anyway".`
    );
  }

  const sh = getAllocWeeklySheet_();
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const now = nowIsoIST_();
  const id = Utilities.getUuid();

  const rowData = header.map(col => {
    switch(col) {
      case 'id': return id;
      case 'month': return month;
      case 'sub': return c.sub;
      case 'email': return c.email;
      case 'name': return c.name;
      case 'client': return client;
      case 'category': return category;
      case 'hours': return hours;
      case 'notes': return notes;
      case 'created_at': return now;
      case 'updated_at': return now;
      case 'start_date': return start_date;
      case 'end_date': return end_date;
      case 'week_code': {
        try {
          const wks = weeksOfMonthIST_(month);
          const hit = wks.find(w => start_date >= w.start && start_date <= w.end);
          return hit ? hit.code : '';
        } catch (_e) { return ''; }
      }
      default: return '';
    }
  });

  sh.appendRow(rowData);
  return { ok: true, id };
}

function listMyAllocations(opts) {
  const c = getGoogleUser_();
  const { month, kind } = opts;
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Month must be YYYY-MM.');

  const meEmail = (c.email || '').toLowerCase();
  const out = [];

  if (!kind || kind === 'projected') {
    const shM = getAllocMonthlySheet_();
    if (shM.getLastRow() >= 2) {
      const valsM = shM.getRange(2, 1, shM.getLastRow() - 1, shM.getLastColumn()).getValues();
      for (const row of valsM) {
        const [id, m, k, sub, email, , client, category, hours, notes] = row;
        if (toYYYYMM_(m) === month &&
            String(k||'').toLowerCase() === 'projected' &&
            ((email||'').toLowerCase() === meEmail || String(sub) === String(c.sub))) {
          out.push({
            id, month, kind: 'projected', client, category,
            hours: Number(hours)||0, notes: notes||'', week_label: '—'
          });
        }
      }
    }
  }

  if (!kind || kind === 'actual') {
    const shW = getAllocWeeklySheet_();
    if (shW.getLastRow() >= 2) {
      const header = shW.getRange(1, 1, 1, shW.getLastColumn()).getValues()[0].map(h => String(h));
      const colMap = header.reduce((acc, h, i) => ({...acc, [h]: i}), {});
      const valsW = shW.getRange(2, 1, shW.getLastRow() - 1, shW.getLastColumn()).getValues();

      for (const row of valsW) {
        const rowMonth = deriveRowMonthFromWeekly_(row, colMap);
        if (rowMonth === month &&
            ((row[colMap.email]||'').toLowerCase() === meEmail || String(row[colMap.sub]) === String(c.sub))) {
          let weekLabel = '(No Date)';
          if (row[colMap.start_date] && row[colMap.end_date]) {
              const startDateStr = (row[colMap.start_date] instanceof Date)
                ? Utilities.formatDate(row[colMap.start_date], TZ, 'yyyy-MM-dd')
                : row[colMap.start_date];
              const endDateStr = (row[colMap.end_date] instanceof Date)
                ? Utilities.formatDate(row[colMap.end_date], TZ, 'yyyy-MM-dd')
                : row[colMap.end_date];
              weekLabel = formatDateRangeLabel_(startDateStr, endDateStr);
          } else if (row[colMap.week_code]) {
            weekLabel = labelForWeek_(month, row[colMap.week_code]);
          }
          out.push({
            id: row[colMap.id],
            month,
            kind: 'actual',
            client: row[colMap.client],
            category: row[colMap.category],
            hours: Number(row[colMap.hours])||0,
            notes: row[colMap.notes]||'',
            week_label: weekLabel
          });
        }
      }
    }
  }
  return out;
}

function listTeamMonthlyAllocations(opts) {
  const { claims, primary } = requireAnyRole_(['manager', 'core']);
  const { month, kind, member_email } = opts;
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Month must be YYYY-MM.');
  
  let allowed = null;
  if (primary === 'manager') {
    allowed = new Set(getTeamMemberEmails_(claims));
    if (member_email && !allowed.has(member_email)) throw new Error('Selected member is not in your team.');
  }
  
  const rows = [];
  
  if (!kind || kind === 'projected') {
    const shM = getAllocMonthlySheet_();
    if (shM.getLastRow() >= 2) {
      const valuesM = shM.getRange(2, 1, shM.getLastRow() - 1, shM.getLastColumn()).getValues();
      for (const [id, m, k, , email, name, client, category, hours, notes] of valuesM) {
        if (toYYYYMM_(m) === month && (k||'').toLowerCase() === 'projected') {
          const e = (email || '').toLowerCase();
          if ((!allowed || allowed.has(e)) && (!member_email || e === member_email)) {
            rows.push({
              id, month,
              kind: 'projected',
              email: e,
              name,
              client,
              category,
              hours: Number(hours)||0,
              notes,
              week_label:'—'
            });
          }
        }
      }
    }
  }
  
  if (!kind || kind === 'actual') {
    const shW = getAllocWeeklySheet_();
    if (shW.getLastRow() >= 2) {
      const header = shW.getRange(1, 1, 1, shW.getLastColumn()).getValues()[0];
      const colMap = header.reduce((acc, h, i) => ({...acc, [h]: i}), {});
      const valuesW = shW.getRange(2, 1, shW.getLastRow() - 1, shW.getLastColumn()).getValues();
      
      for (const row of valuesW) {
        const rowMonth = deriveRowMonthFromWeekly_(row, colMap);
        if (rowMonth === month) {
          const e = (row[colMap.email] || '').toLowerCase();
          if ((!allowed || allowed.has(e)) && (!member_email || e === member_email)) {
            let weekLabel = '(No Date)';
            if (row[colMap.start_date] && row[colMap.end_date]) {
                const startDateStr = (row[colMap.start_date] instanceof Date)
                  ? Utilities.formatDate(row[colMap.start_date], TZ, 'yyyy-MM-dd')
                  : row[colMap.start_date];
                const endDateStr = (row[colMap.end_date] instanceof Date)
                  ? Utilities.formatDate(row[colMap.end_date], TZ, 'yyyy-MM-dd')
                  : row[colMap.end_date];
                weekLabel = formatDateRangeLabel_(startDateStr, endDateStr);
            } else if (row[colMap.week_code]) {
              weekLabel = labelForWeek_(month, row[colMap.week_code]);
            }
            rows.push({
              id: row[colMap.id],
              month,
              kind: 'actual',
              email: e,
              name: row[colMap.name],
              client: row[colMap.client], 
              category: row[colMap.category],
              hours: Number(row[colMap.hours])||0,
              notes: row[colMap.notes],
              week_label: weekLabel
            });
          }
        }
      }
    }
  }
  return rows;
}

/***** ==== MUTATIONS ==== */
function deleteMyAllocation(id) {
  const c = getGoogleUser_();
  const meEmail = (c.email || '').toLowerCase();
  const currMonth = isoMonthIST_();
  const prevMonth = isoPrevMonthIST_();

  const shM = getAllocMonthlySheet_();
  const lastM = shM.getLastRow();
  if (lastM >= 2) {
    const valsM = shM.getRange(2,1,lastM-1,shM.getLastColumn()).getValues();
    for (let i=0;i<valsM.length;i++){
      const [rid, m, k, sub, email] = valsM[i];
      if (String(rid) === String(id)) {
        if ((email||'').toLowerCase() !== meEmail && String(sub) !== String(c.sub))
          throw new Error('Cannot delete another user\'s entry.');
        const mm = toYYYYMM_(m);
        if ((k||'').toLowerCase() !== 'projected' || !(mm === currMonth || mm === prevMonth))
          throw new Error('Only current or previous month projected entries can be deleted.');
        shM.deleteRow(i + 2); 
        return { ok:true };
      }
    }
  }
  const shW = getAllocWeeklySheet_();
  const lastW = shW.getLastRow();
  if (lastW >= 2) {
    const header = shW.getRange(1,1,1,shW.getLastColumn()).getValues()[0];
    const colMap = header.reduce((acc, h, i) => ({...acc, [h]: i}), {});
    const valsW = shW.getRange(2,1,lastW-1,shW.getLastColumn()).getValues();
    for (let i=0;i<valsW.length;i++) {
      const rowData = valsW[i];
      const rid = rowData[colMap.id];
      const sub = rowData[colMap.sub];
      const email = rowData[colMap.email];
      if (String(rid) === String(id)) {
        if ((email||'').toLowerCase() !== meEmail && String(sub) !== String(c.sub))
          throw new Error('Cannot delete another user\'s entry.');
        const mm = deriveRowMonthFromWeekly_(rowData, colMap);
        if (!allowCurrOrPrevMonth_(mm))
          throw new Error('Only current or previous month weekly entries can be deleted.');
        shW.deleteRow(i + 2); 
        return { ok:true };
      }
    }
  }
  throw new Error('Entry not found.');
}

// Delete multiple allocations (best-effort)
function deleteMultipleAllocations(ids) {
  const results = [];
  for (const id of ids) {
    try {
      deleteMyAllocation(id);
      results.push({ id, status: 'success' });
    } catch (e) {
      results.push({ id, status: 'error', error: e.message });
    }
  }
  return { results };
}

function updateMyAllocation(upd) {
  const c = getGoogleUser_();
  const id = String(upd && upd.id || '');
  if (!id) throw new Error('Missing id');
  const meEmail = (c.email || '').toLowerCase();
  const currMonth = isoMonthIST_();
  const prevMonth = isoPrevMonthIST_();
  const changes = {};
  ['client','category','hours','notes'].forEach(k => { if (k in upd) changes[k] = upd[k]; });
  if ('hours' in changes && !(Number(changes.hours) > 0)) throw new Error('Hours must be > 0.');
  const now = nowIsoIST_();

  // if client name is being edited, ensure it exists
  if ('client' in changes && changes.client) ensureClientExists_(changes.client);

  const shM = getAllocMonthlySheet_();
  const lastM = shM.getLastRow();
  if (lastM >= 2) {
    const valsM = shM.getRange(2,1,lastM-1,shM.getLastColumn()).getValues();
    for (let i=0;i<valsM.length;i++){
      const [rid, m, k, sub, email] = valsM[i];
      if (String(rid) === id) {
        if ((email||'').toLowerCase() !== meEmail && String(sub) !== String(c.sub))
          throw new Error('Cannot edit another user\'s entry.');
        const mm = toYYYYMM_(m);
        if (!(mm === currMonth || mm === prevMonth) || (k||'').toLowerCase() !== 'projected')
          throw new Error('Can only edit current or previous month projected entries.');
        const row = i + 2;
        if ('client' in changes)   shM.getRange(row,7).setValue(changes.client);
        if ('category' in changes) shM.getRange(row,8).setValue(changes.category);
        if ('hours' in changes)    shM.getRange(row,9).setValue(changes.hours);
        if ('notes' in changes)    shM.getRange(row,10).setValue(changes.notes);
        shM.getRange(row,12).setValue(now);
        return { ok:true };
      }
    }
  }

  const shW = getAllocWeeklySheet_();
  const lastW = shW.getLastRow();
  if (lastW >= 2) {
    const header = shW.getRange(1, 1, 1, shW.getLastColumn()).getValues()[0];
    const colMap = header.reduce((acc, h, i) => ({...acc, [h]: i+1}), {}); // 1-based for setValue()
    const valsW = shW.getRange(2, 1, shW.getLastRow() - 1, shW.getLastColumn()).getValues();
    for (let i=0;i<valsW.length;i++){
      const rowData = valsW[i];
      if (String(rowData[0]) === id) {
        const emailCell = rowData[colMap.email - 1];
        const subCell = rowData[colMap.sub - 1];
        if ((emailCell||'').toLowerCase() !== meEmail && String(subCell) !== String(c.sub))
          throw new Error('Cannot edit another user\'s entry.');
        const zeroMap = Object.fromEntries(Object.entries(colMap).map(([k, v]) => [k, v-1]));
        const mm = deriveRowMonthFromWeekly_(rowData, zeroMap);
        if (!allowCurrOrPrevMonth_(mm))
          throw new Error('Can only edit current or previous month weekly entries.');
        const row = i + 2;
        if ('client' in changes && colMap.client)   shW.getRange(row,colMap.client).setValue(changes.client);
        if ('category' in changes && colMap.category) shW.getRange(row,colMap.category).setValue(changes.category);
        if ('hours' in changes && colMap.hours)     shW.getRange(row,colMap.hours).setValue(changes.hours);
        if ('notes' in changes && colMap.notes)     shW.getRange(row,colMap.notes).setValue(changes.notes);
        if (colMap.updated_at) shW.getRange(row,colMap.updated_at).setValue(now);
        return { ok:true };
      }
    }
  }
  throw new Error('Entry not found.');
}

function listAvailableMonths(opts) {
  opts = opts || {};
  const monthsBack = Math.max(1, Number(opts.monthsBack) || 6);
  const months = recentMonthsIST_(monthsBack); // newest -> oldest
  const monthSet = new Set(months);

  const kind  = String(opts.kind  || 'actual').toLowerCase(); // actual | projected | any
  const scope = String(opts.scope || 'my').toLowerCase();     // my | team | all
  const includeEmptyIfNone = ('includeEmptyIfNone' in opts) ? !!opts.includeEmptyIfNone : true;

  const memberEmail = String(opts.member_email || '').toLowerCase().trim();

  let me = null;
  let allowedEmails = null;

  if (scope === 'my') {
    me = getGoogleUser_();
  } else {
    const auth = requireAnyRole_(['manager', 'core']);
    const claims = auth.claims;

    // If manager and scope=team → restrict to their team.
    // If core → no restriction (can see all).
    if (scope === 'team' && auth.primary === 'manager') {
      allowedEmails = new Set(getTeamMemberEmails_(claims));
      // (optional) include manager themselves:
      if (claims.email) allowedEmails.add(String(claims.email).toLowerCase());
    }
  }

  const monthsWithData = new Set();

  function scopeMatch_(rowEmailLower, rowSub) {
    if (memberEmail && rowEmailLower !== memberEmail) return false;

    if (scope === 'my') {
      const meEmail = String(me.email || '').toLowerCase();
      const meSub   = String(me.sub || '');
      return rowEmailLower === meEmail || String(rowSub || '') === meSub;
    }

    if (allowedEmails) return allowedEmails.has(rowEmailLower);
    return true; // core/all
  }

  // PROJECTED (monthly)
  if (kind === 'projected' || kind === 'any') {
    const shM = getAllocMonthlySheet_();
    const last = shM.getLastRow();
    if (last >= 2) {
      const vals = shM.getRange(2, 1, last - 1, shM.getLastColumn()).getValues();
      for (const row of vals) {
        const mm = toYYYYMM_(row[1]);
        const k  = String(row[2] || '').toLowerCase();
        if (k !== 'projected') continue;
        if (!monthSet.has(mm)) continue;

        const rowSub   = row[3];
        const rowEmail = String(row[4] || '').toLowerCase();
        if (!scopeMatch_(rowEmail, rowSub)) continue;

        monthsWithData.add(mm);
      }
    }
  }

  // ACTUAL (weekly)
  if (kind === 'actual' || kind === 'any') {
    const shW = getAllocWeeklySheet_();
    const last = shW.getLastRow();
    if (last >= 2) {
      const header = shW.getRange(1, 1, 1, shW.getLastColumn()).getValues()[0].map(String);
      const colMap = header.reduce((acc, h, i) => (acc[h] = i, acc), {});
      const vals = shW.getRange(2, 1, last - 1, shW.getLastColumn()).getValues();

      for (const row of vals) {
        const mm = deriveRowMonthFromWeekly_(row, colMap);
        if (!monthSet.has(mm)) continue;

        const rowSub   = row[colMap.sub];
        const rowEmail = String(row[colMap.email] || '').toLowerCase();
        if (!scopeMatch_(rowEmail, rowSub)) continue;

        monthsWithData.add(mm);
      }
    }
  }

  // Only show months that have data
  let out = months.filter(m => monthsWithData.has(m));

  // If absolutely nothing exists (brand new DB), show last 6 so UI isn’t empty
  if (!out.length && includeEmptyIfNone) out = months;

  return out;
}


/***** ==== CALENDAR IMPORT ==== */
function fetchMyCalendarEvents(dateRangeString) {
  try {
    const parts = (dateRangeString || '').split('-');
    if (parts.length !== 6) throw new Error("Invalid date range format.");
    const start = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2], 0, 0, 0);
    const end   = new Date(parts[3], parseInt(parts[4], 10) - 1, parts[5], 23, 59, 59);

    const events = CalendarApp.getDefaultCalendar().getEvents(start, end);

    const myEmail = (Session.getActiveUser().getEmail() || '').toLowerCase();
    const buckets = {};

    for (const ev of events) {
      if (ev.isAllDayEvent()) continue;

      // skip events where the user has DECLINED
      if (myEmail) {
        try {
          const guest = ev.getGuestByEmail(myEmail);
          if (guest && guest.getGuestStatus() === CalendarApp.GuestStatus.NO) {
            continue;
          }
        } catch (_e) {
          // ignore lookup issues
        }
      }

      const dur = Math.max(0, (ev.getEndTime().getTime() - ev.getStartTime().getTime()) / 3600000);
      if (dur <= 0) continue;

      const titleRaw = (ev.getTitle() || 'Untitled').trim();
      const key = titleRaw.toLowerCase();

      let guests = [];
      try {
        const list = ev.getGuestList(true) || [];
        guests = list.map(g => String(g.getEmail() || '').toLowerCase()).filter(Boolean);
      } catch (_e) {
        guests = [];
      }

      if (myEmail) guests.push(myEmail);

      if (!buckets[key]) {
        buckets[key] = {
          title: titleRaw,
          hours: 0,
          count: 0,
          sampleStart: ev.getStartTime(),
          sampleEnd: ev.getEndTime(),
          attendeeSet: new Set(),
          maxAttendeeCount: 0
        };
      }
      buckets[key].hours += dur;
      buckets[key].count += 1;
      if (ev.getStartTime() < buckets[key].sampleStart) buckets[key].sampleStart = ev.getStartTime();
      if (ev.getEndTime() > buckets[key].sampleEnd) buckets[key].sampleEnd = ev.getEndTime();

      guests.forEach(g => buckets[key].attendeeSet.add(g));
      buckets[key].maxAttendeeCount = Math.max(buckets[key].maxAttendeeCount, guests.length);
    }

    const fmt = p => Utilities.formatDate(p, TZ, 'yyyy-MM-dd HH:mm');
    return Object.values(buckets).map(b => ({
      title: b.title,
      hours: Number(b.hours.toFixed(2)),
      count: b.count,
      start: fmt(b.sampleStart),
      end: fmt(b.sampleEnd),
      attendees: Array.from(b.attendeeSet),
      attendeeCount: b.maxAttendeeCount
    })).sort((a,b) => a.title.localeCompare(b.title));

  } catch (e) {
    console.error("Error in fetchMyCalendarEvents: " + e.toString());
    return [];
  }
}

/***** ==== CLIENTS & MEMBERS ==== */
function listClients() {
  const sh = getClientsSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const out = [];
  const rows = sh.getRange(2,1,last-1,2).getValues();
  for (const [client, active] of rows) {
    if (client && String(active).toLowerCase() !== 'false') out.push(String(client));
  }
  return out.sort();
}
function addClient(name) {
  requireAnyRole_(['core']);
  const n = String(name||'').trim();
  if (!n) throw new Error('Client name required.');
  const sh = getClientsSheet_();
  const last = sh.getLastRow();
  if (last >= 2) {
    const vals = sh.getRange(2,1,last-1,1).getValues()
      .flat()
      .map(v => String(v).trim().toLowerCase());
    if (vals.includes(n.toLowerCase())) return { ok:true, created:false };
  }
  sh.appendRow([n, true]);
  return { ok:true, created:true };
}
function listMembersForViewer() {
  const viewer = getGoogleUser_();
  const roles = getUserRoles_(viewer);
  const primary = pickPrimaryRole_(roles);
  const emailToName = mapEmailToName_();
  if (primary === 'core') {
    return Object.entries(emailToName)
      .map(([email, name]) => ({ email, name }))
      .sort((a,b) => (a.name||a.email).localeCompare(b.name||b.email));
  }
  if (primary === 'manager') {
    const emails = getTeamMemberEmails_(viewer);
    return emails.map(e => ({ email: e, name: emailToName[e] || '' }))
      .sort((a,b) => (a.name||a.email).localeCompare(b.name||b.email));
  }
  return [{ email: String(viewer.email).toLowerCase(), name: viewer.name || '' }];
}
function getTeamMemberEmails_(managerClaims) {
  const sh = getTeamsSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const data = sh.getRange(2, 1, last - 1, 4).getValues();
  const mgrSub = String(managerClaims.sub || '');
  const mgrEmail = String(managerClaims.email || '').toLowerCase();
  const set = new Set();
  for (const [ms, me, , ue] of data) {
    if (((ms && String(ms) === mgrSub) || (me && String(me).toLowerCase() === mgrEmail)) && ue) {
      set.add(String(ue).toLowerCase());
    }
  }
  return Array.from(set);
}
function mapEmailToName_() {
  const sh = getUsersSheet_();
  const last = sh.getLastRow();
  const map = {};
  if (last >= 2) {
    const vals = sh.getRange(2,1,last-1,3).getValues();
    for (const [, email, name] of vals) {
      if (email) map[String(email).toLowerCase()] = String(name||'');
    }
  }
  return map;
}

/***** ==== REMINDER API: Latest weekly allocation date ==== */
function getMyAllocationCoverage() {
  const c = getGoogleUser_();
  const meEmail = (c.email || '').toLowerCase();
  const sh = getAllocWeeklySheet_();
  const last = sh.getLastRow();
  if (last < 2) return { latest_end_date: '', label: '' };

  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const col = header.reduce((m, h, i) => (m[h] = i, m), {});
  const vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();

  let latest = null;
  for (const row of vals) {
    const rowEmail = String(row[col.email] || '').toLowerCase();
    const rowSub   = String(row[col.sub] || '');
    if (rowEmail !== meEmail && rowSub !== String(c.sub)) continue;

    const ed = row[col.end_date] || row[col.start_date] || '';
    if (!ed) continue;

    const d = (ed instanceof Date) ? ed : new Date(ed);
    if (!isFinite(d)) continue;

    if (!latest || d > latest) latest = d;
  }

  if (!latest) return { latest_end_date: '', label: '' };
  return {
    latest_end_date: Utilities.formatDate(latest, TZ, 'yyyy-MM-dd'),
    label: Utilities.formatDate(latest, TZ, 'MMM d, yyyy')
  };
}

/***** ==== EXTRA: Preflight helper for import screen ==== */
function listMyExistingAllocationsInRange(start_date, end_date) {
  const res = checkForOverlappingAllocations(start_date, end_date, '', '');
  return res.existingEntries || [];
}

/***** ==== CORE: MASTER ALLOCATIONS (PIVOT) ==== *****/

function normalizeClientForMaster_(client) {
  const s = String(client || '').trim();
  const low = s.toLowerCase();

  // Roll up any BD variants into a single "BD" bucket
  // Examples: "BD", "BD - Chorus", "BD- Straive", "BD OGS", "BD/ Internal"
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
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return new Map();

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(h => String(h).toLowerCase().trim());
  
  // Dynamic column finding
  const coreIdx = headers.indexOf('core'); 
  const clientIdx = headers.indexOf('client');

  if (coreIdx === -1 || clientIdx === -1) return new Map();

  const map = new Map();
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const client = String(row[clientIdx] || '').trim();
    const core = String(row[coreIdx] || '').trim();
    if (client) {
      // Key: lowercase client for matching
      map.set(client.toLowerCase(), core);
    }
  }
  return map;
}

/**
 * Returns a pivot-like structure:
 * {
 *   month: "YYYY-MM",
 *   clients: [{name: "Client1", core: "CoreA"}, ...], 
 *   rows: [
 *     { email, name, allocations: { "BD": 12.5, "Angara": 8, ... } },
 *     ...
 *   ]
 * }
 */
function getCoreMasterAllocations(opts) {
  requireAnyRole_(['core']);

  const month = String(opts && opts.month || '').trim();
  const groupBd = (opts && 'group_bd' in opts) ? !!opts.group_bd : true; // default true
  const groupLeave = (opts && 'group_leave' in opts) ? !!opts.group_leave : true;
  const groupInternal = (opts && 'group_internal' in opts) ? !!opts.group_internal : true;

  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Month must be YYYY-MM.');

  // 1. Prepare Core Mapping
  const coreMap = getClientsCoreMap_();

  // Reuse your existing access-controlled fetch (core sees all)
  const allocRows = listTeamMonthlyAllocations({ month, kind: 'actual', member_email: '' }) || [];

  const byMember = new Map(); // email -> {email,name,allocations:{}}
  const clientSet = new Set();
  const clientObjs = new Map(); // name -> { name, core, isBd }

  allocRows.forEach(r => {
    const email = String(r.email || '').toLowerCase();
    if (!email) return;

    const name = String(r.name || '').trim();
    
    // Logic change: conditionally normalize
    let client = '';
    if (groupBd) {
      client = normalizeClientForMaster_(r.client);
    } else {
      client = String(r.client || '').trim();
    }

    // Combine Leave & Personal Commitments -> LEAVE
    if (groupLeave && ['leave', 'personal commitments'].includes(client.toLowerCase())) {
      client = 'LEAVE';
    }

    // Group Internal
    // "Internal – CS" can use en-dash or hyphen. We handle both.
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

    if (!client) return;

    clientSet.add(client);

    // Track metadata for this client if new
    if (!clientObjs.has(client)) {
      // "BD" special case
      const isBd = (groupBd && client === 'BD');
      
      // Look up core. 
      // STRICT REQUIREMENT: "BD" (grouped) goes to the end -> force empty core.
      // Other unassigned also go to end.
      let core = coreMap.get(client.toLowerCase()) || ''; 
      if (isBd) core = ''; 

      clientObjs.set(client, { name: client, core, isBd });
    }

    if (!byMember.has(email)) {
      byMember.set(email, { email, name, allocations: {} });
    }
    const m = byMember.get(email);
    m.allocations[client] = (Number(m.allocations[client]) || 0) + hours;
  });

  // Sort clients:
  // 1. BD first (if groupBd is true) ? 
  //    Actually user wants grouped by Core. 
  //    If BD has no core, it goes to "Unassigned" bucket?
  //    Let's stick to: Core (A-Z) -> Client (A-Z).
  //    If groupBd is true and 'BD' is present, we treat it as a client.
  
  let clientsFull = Array.from(clientObjs.values());

  clientsFull.sort((a, b) => {
    // 1. By Core (empty last)
    const cA = (a.core || '').toLowerCase();
    const cB = (b.core || '').toLowerCase();
    
    if (cA && !cB) return -1;
    if (!cA && cB) return 1;
    const coreDiff = cA.localeCompare(cB);
    if (coreDiff !== 0) return coreDiff;

    // 2. By Client Name
    return a.name.localeCompare(b.name);
  });

  // Sort members by name then email
  const rows = Array.from(byMember.values()).sort((a, b) => {
    const an = (a.name || a.email).toLowerCase();
    const bn = (b.name || b.email).toLowerCase();
    return an.localeCompare(bn);
  });

  // Return full client objects so export can use them
  return { month, clients: clientsFull, rows };
}

/**
 * Builds an XLSX file for the master allocations and returns base64.
 * Frontend will download it.
 */
function exportCoreMasterAllocationsXlsx(opts) {
  requireAnyRole_(['core']);

  const data = getCoreMasterAllocations(opts);
  const month = data.month;
  const groupBd = (opts && 'group_bd' in opts) ? !!opts.group_bd : true;
  const groupLeave = (opts && 'group_leave' in opts) ? !!opts.group_leave : true;
  const groupInternal = (opts && 'group_internal' in opts) ? !!opts.group_internal : true;

  const isDetailed = (!groupBd || !groupLeave || !groupInternal);
  const suffix = isDetailed ? ' (Detailed)' : '';
  const tmp = SpreadsheetApp.create(`Master Allocations ${month}${suffix}`);
  const sh = tmp.getSheets()[0];
  sh.setName('Master');

  // New Header Structure:
  // Row 1: "Member", "Core A", "Core A", "Core B", ...
  // Row 2: "Member", "Client 1", "Client 2", "Client 3", ...

  const header1 = ['Member'];
  const header2 = ['Member'];

  data.clients.forEach(c => {
    header1.push(c.core || '(Unassigned)');
    header2.push(c.name);
  });

  const values = [header1, header2];

  data.rows.forEach(r => {
    const memberLabel = (r.name || r.email);
    const row = [memberLabel];

    data.clients.forEach(c => {
      const v = Number((r.allocations && r.allocations[c.name]) || 0);
      row.push(v ? v : ''); // blank instead of 0 for readability
    });

    values.push(row);
  });

  // Write values
  sh.getRange(1, 1, values.length, values[0].length).setValues(values);

  // Formatting
  
  // 1. Merge the Top Row groupings (Core Names)
  // Logic: Iterate header1, find contiguous ranges of same core name, merge.
  // Columns are 1-indexed. Start checking from Col 2.
  if (header1.length > 2) {
    let startCol = 2;
    let currentColVal = header1[1];
    
    for (let c = 3; c <= header1.length + 1; c++) {
      // Loop one extra time +1 to handle the closure of the last group
      // If c > length, we just finish the last group.
      const val = (c <= header1.length) ? header1[c-1] : '###END###'; 
      
      if (val !== currentColVal) {
        // Range ended at c-1
        const numCols = (c - 1) - startCol + 1;
        if (numCols > 1) {
          sh.getRange(1, startCol, 1, numCols).merge().setHorizontalAlignment('center');
        } else {
          sh.getRange(1, startCol).setHorizontalAlignment('center');
        }
        
        // Start new range
        startCol = c;
        currentColVal = val;
      }
    }
  }

  // Bold Headers
  sh.getRange(1, 1, 2, values[0].length).setFontWeight('bold').setVerticalAlignment('middle');
  
  // Number Format for data
  if (values.length > 2 && values[0].length > 1) {
    sh.getRange(3, 2, values.length - 2, values[0].length - 1).setNumberFormat('0.00');
  }
  
  sh.setFrozenRows(2);
  sh.setFrozenColumns(1);
  sh.autoResizeColumns(1, values[0].length);

  // Export as XLSX
  const exportUrl = `https://docs.google.com/spreadsheets/d/${tmp.getId()}/export?format=xlsx`;
  const blob = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  }).getBlob().setName(`Master_Allocations_${month}.xlsx`);

  // Cleanup temp sheet file
  try { DriveApp.getFileById(tmp.getId()).setTrashed(true); } catch (_e) {}

  return {
    filename: blob.getName(),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

