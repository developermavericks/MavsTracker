require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const mappings = [
  ['tech@themavericksindia.com', 'pooja@themavericksindia.com'],
  ['chetan@themavericksindia.com', 'pooja@themavericksindia.com'],
  ['pooja@themavericksindia.com', 'chetan@themavericksindia.com'],
  ['tech@themavericksindia.com', 'manvi@themavericksindia.com'],
  ['ananya@themavericksindia.com', 'sushant@themavericksindia.com'],
  ['viviqa@themavericksindia.com', 'drishti.c@themavericksindia.com'],
  ['aashna@themavericksindia.com', 'muskaan.harjai@themavericksindia.com'],
  ['avinash@themavericksindia.com', 'shivani@themavericksindia.com'],
  ['ila@themavericksindia.com', 'tonmoyee@themavericksindia.com'],
  ['ila@themavericksindia.com', 'ritik@themavericksindia.com'],
  ['ila@themavericksindia.com', 'chhavi.a@themavericksindia.com'],
  ['shrestha@themavericksindia.com', 'mansi@themavericksindia.com'],
  ['shrestha@themavericksindia.com', 'rajshree@themavericksindia.com'],
  ['shrestha@themavericksindia.com', 'rishika@themavericksindia.com'],
  ['pavithra@themavericksindia.com', 'priyadarshini@themavericksindia.com'],
  ['pavithra@themavericksindia.com', 'sanya.p@themavericksindia.com'],
  ['pavithra@themavericksindia.com', 'ananya.k@themavericksindia.com'],
  ['indrajit@themavericksindia.com', 'vanshika@themavericksindia.com'],
  ['mahek@themavericksindia.com', 'triyanshi@themavericksindia.com'],
  ['mahek@themavericksindia.com', 'varun@themavericksindia.com'],
  ['mahek@themavericksindia.com', 'grishma@themavericksindia.com'],
  ['srishtee@themavericksindia.com', 'udita@themavericksindia.com'],
  ['srishtee@themavericksindia.com', 'snigdha@themavericksindia.com'],
  ['srishtee@themavericksindia.com', 'laveena@themavericksindia.com'],
  ['srishtee@themavericksindia.com', 'manvi@themavericksindia.com'],
  ['srishtee@themavericksindia.com', 'riya@themavericksindia.com'],
  ['srishtee@themavericksindia.com', 'avarna@themavericksindia.com'],
  ['vibhuti@themavericksindia.com', 'muskaan@themavericksindia.com'],
  ['vibhuti@themavericksindia.com', 'harprateek@themavericksindia.com'],
  ['vibhuti@themavericksindia.com', 'sucheta@themavericksindia.com'],
  ['vibhuti@themavericksindia.com', 'kavita@themavericksindia.com'],
  ['vibhuti@themavericksindia.com', 'kashish@themavericksindia.com'],
  ['muskaan@themavericksindia.com', 'harshita@themavericksindia.com'],
  ['muskaan@themavericksindia.com', 'bhavya@themavericksindia.com'],
  ['akshay@themavericksindia.com', 'alisha@themavericksindia.com'],
  ['manaswi@themavericksindia.com', 'muskaan.bhardwaj@themavericksindia.com'],
  ['anil@themavericksindia.com', 'ananya@themavericksindia.com'],
  ['anil@themavericksindia.com', 'viviqa@themavericksindia.com'],
  ['samrat@themavericksindia.com', 'ariba@themavericksindia.com'],
  ['samrat@themavericksindia.com', 'vishakha@themavericksindia.com'],
  ['samrat@themavericksindia.com', 'vibhu@themavericksindia.com'],
  ['akshay@themavericksindia.com', 'ishmeet@themavericksindia.com'],
  ['kavita@themavericksindia.com', 'muskaan.dudeja@themavericksindia.com'],
  ['kavita@themavericksindia.com', 'jeetika@themavericksindia.com'],
  ['satyam.singh@themavericksindia.com', 'divyansh.sharma@themavericksindia.com'],
  ['satyam.singh@themavericksindia.com', 'arun.raghav@themavericksindia.com']
];

async function run() {
  const allEmails = [...new Set(mappings.flat())];
  
  for (const email of allEmails) {
    const { data: user } = await supabase.from('users').select('id').eq('email', email).single();
    if (!user) {
      console.log('Creating user:', email);
      await supabase.from('users').insert([{ email, name: email.split('@')[0], role: 'team' }]);
    }
  }

  for (const [mEmail, memEmail] of mappings) {
    const { data: manager } = await supabase.from('users').select('id').eq('email', mEmail).single();
    const { data: member } = await supabase.from('users').select('id').eq('email', memEmail).single();
    
    if (manager && member) {
      const { error } = await supabase.from('teams').upsert([{ manager_id: manager.id, member_id: member.id }], { onConflict: 'manager_id,member_id' });
      if (error) console.error('Error mapping:', mEmail, '->', memEmail, error.message);
      else console.log('Mapped:', mEmail, '->', memEmail);
    }
  }
}
run();
