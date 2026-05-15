const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const clients = [
  'iCreate', 'mPokket', 'FREE_TIME', 'LEAVE', 'BD', 'Personal Commitments', 
  'Internal - CS', 'Internal HR', 'Internal Tech', 'Internal Finance'
];

async function seed() {
  console.log('Adding clients...');
  for (const name of clients) {
    const { data, error } = await supabase
      .from('clients')
      .insert([{ name }])
      .select();
    
    if (error) {
      if (error.code === '23505') {
        console.log(`Skipping ${name} (already exists)`);
      } else {
        console.error(`Error adding ${name}:`, error.message);
      }
    } else {
      console.log(`Added: ${name}`);
    }
  }
  console.log('Done!');
}

seed();
