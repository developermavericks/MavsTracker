const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'arunkumar@themavericksindia.com');
  
  if (error) {
    console.error('Error fetching user:', error);
    return;
  }
  
  console.log('Arun record:', JSON.stringify(data, null, 2));
}

checkUser();
