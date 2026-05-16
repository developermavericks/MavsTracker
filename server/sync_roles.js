const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const mapping = {
  core: [
    'pooja@themavericksindia.com',
    'chetan@themavericksindia.com',
    'tech@themavericksindia.com',
    'mitali.p@themavericksindia.com',
    'archana@themavericksindia.com',
    'smriti@themavericksindia.com',
    'gaurav@themavericksindia.com',
    'avinash@themavericksindia.com',
    'satyam.singh@themavericksindia.com',
    'arunkumar@themavericksindia.com',
    'divyanshsharma@themavericksindia.com'
  ],
  manager: [
    'aashna@themavericksindia.com',
    'mahek@themavericksindia.com',
    'srishtee@themavericksindia.com',
    'vibhuti@themavericksindia.com',
    'akshay@themavericksindia.com',
    'manaswi@themavericksindia.com',
    'muskaan@themavericksindia.com',
    'indrajit@themavericksindia.com',
    'pavithra@themavericksindia.com',
    'shrestha@themavericksindia.com',
    'ila@themavericksindia.com',
    'samrat@themavericksindia.com',
    'anil@themavericksindia.com',
    'viviqa@themavericksindia.com',
    'ananya@themavericksindia.com',
    'kavita@themavericksindia.com'
  ]
};

async function sync() {
  for (const role in mapping) {
    for (const email of mapping[role]) {
      const { data, error } = await supabase
        .from('users')
        .update({ role: role })
        .eq('email', email.toLowerCase());
      
      if (error) {
        console.error(`Error updating ${email}:`, error.message);
      } else {
        console.log(`Updated ${email} to ${role}`);
      }
    }
  }
}

sync();
