const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const LARGE_CLIENTS = [
  'omnicom global solutions', 'chargezone', 'gradright', 'musashi', 
  'capital league', 'icreate', 'pearl academy', 'add education'
];

const MEDIUM_CLIENTS = [
  'merrakki', 'murf al', 'musashi-d', 'plaksha', 'crazzy bosses', 
  'optiemus infracom', 'pmi', 'angara', 'bambrew', 'chupps', 
  'clinikally', 'eruditus'
];

async function seedFinancials() {
  console.log('--- Initializing Financial Mock Data Seed ---');

  // 1. Seed Client Budgets
  console.log('Fetching all clients...');
  const { data: clients, error: clientFetchErr } = await supabase
    .from('clients')
    .select('id, name');

  if (clientFetchErr) {
    console.error('Failed to fetch clients:', clientFetchErr);
    return;
  }

  console.log(`Found ${clients.length} clients. Setting base budgets...`);
  let budgetUpdatesCount = 0;
  
  for (const c of clients) {
    const lowName = c.name.toLowerCase().trim();
    let budget = 0;

    if (LARGE_CLIENTS.some(name => lowName.includes(name))) {
      // Seed between ₹750,000 and ₹1,500,000 in steps of ₹50,000
      budget = 750000 + Math.floor(Math.random() * 16) * 50000;
    } else if (MEDIUM_CLIENTS.some(name => lowName.includes(name))) {
      // Seed between ₹250,000 and ₹700,000 in steps of ₹25,000
      budget = 250000 + Math.floor(Math.random() * 19) * 25000;
    } else {
      // Small or miscellaneous/internal client
      // Seed between ₹40,000 and ₹180,000 in steps of ₹10,000
      budget = 40000 + Math.floor(Math.random() * 15) * 10000;
    }

    const { error: updateErr } = await supabase
      .from('clients')
      .update({ budget })
      .eq('id', c.id);

    if (updateErr) {
      console.error(`Failed to update budget for client ${c.name}:`, updateErr);
    } else {
      budgetUpdatesCount++;
    }
  }
  console.log(`Successfully updated base budgets for ${budgetUpdatesCount} clients.`);

  // 2. Seed Employee Salaries
  console.log('\nFetching all users...');
  const { data: users, error: userFetchErr } = await supabase
    .from('users')
    .select('id, name, email, role');

  if (userFetchErr) {
    console.error('Failed to fetch users:', userFetchErr);
    return;
  }

  console.log(`Found ${users.length} users. Setting base salaries...`);
  let salaryUpdatesCount = 0;

  for (const u of users) {
    let salary = 0;

    if (u.role === 'core') {
      // Directors & Core team: Seed between ₹150,000 and ₹250,000
      salary = 150000 + Math.floor(Math.random() * 11) * 10000;
    } else if (u.role === 'manager') {
      // Managers: Seed between ₹85,000 and ₹135,000
      salary = 85000 + Math.floor(Math.random() * 11) * 5000;
    } else {
      // Core Engineers / Designers: Seed between ₹45,000 and ₹95,000
      salary = 45000 + Math.floor(Math.random() * 11) * 5000;
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ salary })
      .eq('id', u.id);

    if (updateErr) {
      console.error(`Failed to update salary for user ${u.name || u.email}:`, updateErr);
    } else {
      salaryUpdatesCount++;
    }
  }
  console.log(`Successfully updated base salaries for ${salaryUpdatesCount} users.`);

  console.log('\n--- Financial Seeding Complete! ---');
}

seedFinancials().catch(console.error);
