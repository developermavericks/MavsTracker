const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function seed() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, 'Credentials (2) (1).xlsx'));

  console.log('--- Seeding Clients ---');
  const clientSheet = workbook.getWorksheet('clients');
  const clients = [];
  clientSheet.eachRow((row, i) => {
    if (i === 1) return;
    const name = row.getCell(1).text;
    const core = row.getCell(3).text;
    if (name) clients.push({ name, core_owner: core });
  });
  const { error: clientErr } = await supabase.from('clients').upsert(clients, { onConflict: 'name' });
  if (clientErr) console.error('Client Error:', clientErr);

  console.log('--- Seeding Users ---');
  const userSheet = workbook.getWorksheet('Users');
  const users = [];
  userSheet.eachRow((row, i) => {
    if (i === 1) return;
    const sub = row.getCell(1).text;
    const email = row.getCell(2).text;
    const name = row.getCell(3).text;
    const pictureCell = row.getCell(4);
    let picture = '';
    if (pictureCell.value && typeof pictureCell.value === 'object') {
      picture = pictureCell.value.text || '';
    } else {
      picture = pictureCell.text || '';
    }
    if (email) users.push({ sub, email, name, picture });
  });
  
  // Also add roles from the 'roles' sheet
  const roleSheet = workbook.getWorksheet('roles');
  const roleMap = {};
  roleSheet.eachRow((row, i) => {
    if (i === 1) return;
    roleMap[row.getCell(2).text] = row.getCell(3).text;
  });

  users.forEach(u => {
    if (roleMap[u.email]) u.role = roleMap[u.email];
  });

  const { error: userErr } = await supabase.from('users').upsert(users, { onConflict: 'email' });
  if (userErr) console.error('User Error:', userErr);

  console.log('--- Seeding Teams ---');
  const teamSheet = workbook.getWorksheet('teams');
  const { data: dbUsers } = await supabase.from('users').select('id, email');
  const emailToId = dbUsers.reduce((acc, u) => ({ ...acc, [u.email]: u.id }), {});

  const teams = [];
  teamSheet.eachRow((row, i) => {
    if (i === 1) return;
    const managerEmail = row.getCell(2).text;
    const memberEmail = row.getCell(4).text;
    if (emailToId[managerEmail] && emailToId[memberEmail]) {
      teams.push({ manager_id: emailToId[managerEmail], member_id: emailToId[memberEmail] });
    }
  });
  const { error: teamErr } = await supabase.from('teams').upsert(teams);
  if (teamErr) console.error('Team Error:', teamErr);

  console.log('--- Seeding Weekly Allocations ---');
  const weeklySheet = workbook.getWorksheet('allocations_weekly');
  const { data: dbClients } = await supabase.from('clients').select('id, name');
  const clientToId = dbClients.reduce((acc, c) => ({ ...acc, [c.name.toLowerCase()]: c.id }), {});

  const weeklyAllocations = [];
  weeklySheet.eachRow((row, i) => {
    if (i === 1) return;
    const email = row.getCell(5).text;
    const clientName = row.getCell(7).text;
    const category = row.getCell(8).text;
    const hours = parseFloat(row.getCell(9).text);
    const notes = row.getCell(10).text;
    const monthRaw = row.getCell(2).value; // Should be a date or YYYY-MM
    const startDate = row.getCell(13).value;
    const endDate = row.getCell(14).value;

    if (emailToId[email] && clientToId[clientName.toLowerCase()] && !isNaN(hours)) {
      weeklyAllocations.push({
        user_id: emailToId[email],
        month: monthRaw instanceof Date ? monthRaw.toISOString().slice(0, 7) : String(monthRaw).slice(0, 7),
        client_id: clientToId[clientName.toLowerCase()],
        category,
        hours,
        notes,
        start_date: startDate instanceof Date ? startDate.toISOString().split('T')[0] : startDate,
        end_date: endDate instanceof Date ? endDate.toISOString().split('T')[0] : endDate
      });
    }
  });

  // Insert in batches of 1000 to avoid request limits
  for (let i = 0; i < weeklyAllocations.length; i += 1000) {
    const batch = weeklyAllocations.slice(i, i + 1000);
    const { error: allocErr } = await supabase.from('allocations_weekly').upsert(batch);
    if (allocErr) console.error(`Allocation Batch ${i} Error:`, allocErr);
  }

  console.log('--- Seed Complete ---');
}

seed().catch(console.error);
