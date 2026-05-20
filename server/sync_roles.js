const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const mapping = {
  core: [
    "archana@themavericksindia.com",
    "arunkumar@themavericksindia.com",
    "avinash@themavericksindia.com",
    "chetan@themavericksindia.com",
    "divyanshsharma@themavericksindia.com",
    "gaurav@themavericksindia.com",
    "mitali.p@themavericksindia.com",
    "pooja@themavericksindia.com",
    "satyam.singh@themavericksindia.com",
    "smriti@themavericksindia.com",
    "tech@themavericksindia.com"
  ],
  manager: [
    "aashna@themavericksindia.com",
    "akshay@themavericksindia.com",
    "alisha@themavericksindia.com",
    "ananya@themavericksindia.com",
    "anil@themavericksindia.com",
    "chhavi.a@themavericksindia.com",
    "ila@themavericksindia.com",
    "ishmeet@themavericksindia.com",
    "kavita@themavericksindia.com",
    "mahek@themavericksindia.com",
    "manaswi@themavericksindia.com",
    "muskaan@themavericksindia.com",
    "pavithra@themavericksindia.com",
    "rajvi@themavericksindia.com",
    "samrat@themavericksindia.com",
    "shrestha@themavericksindia.com",
    "srishtee@themavericksindia.com",
    "vibhuti@themavericksindia.com"
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
