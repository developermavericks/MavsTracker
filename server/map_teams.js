require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const mappings = [
  ["ila@themavericksindia.com", "aayushi.akhouri@themavericksindia.com"],
  ["mitali.p@themavericksindia.com", "rajvi@themavericksindia.com"],
  ["mitali.p@themavericksindia.com", "nikita.hooper@themavericksindia.com"],
  ["shrestha@themavericksindia.com", "mahek.chacha@themavericksindia.com"],
  ["muskaan@themavericksindia.com", "ridhi@themavericksindia.com"],
  ["mahek@themavericksindia.com", "shreshtha.chaturvedi@themavericksindia.com"],
  ["ishmeet@themavericksindia.com", "surya@themavericksindia.com"],
  ["kavita@themavericksindia.com", "mohamed.hisham@themavericksindia.com"],
  ["pavithra@themavericksindia.com", "apurva@themavericksindia.com"],
  ["shrestha@themavericksindia.com", "abhilasha@themavericksindia.com"],
  ["manaswi@themavericksindia.com", "srishti.chanda@themavericksindia.com"],
  ["srishtee@themavericksindia.com", "ananya.gulati@themavericksindia.com"],
  ["anil@themavericksindia.com", "shinjini@themavericksindia.com"],
  ["muskaan@themavericksindia.com", "neha@themavericksindia.com"],
  ["samrat@themavericksindia.com", "vishakha@themavericksindia.com"],
  ["gaurav@themavericksindia.com", "ritika@themavericksindia.com"],
  ["muskaan@themavericksindia.com", "bhavya@themavericksindia.com"],
  ["akshay@themavericksindia.com", "ishmeet@themavericksindia.com"],
  ["samrat@themavericksindia.com", "ariba@themavericksindia.com"],
  ["aashna@themavericksindia.com", "muskaan@themavericksindia.com"],
  ["samrat@themavericksindia.com", "vibhu@themavericksindia.com"],
  ["mahek@themavericksindia.com", "muskaan@themavericksindia.com"],
  ["archana@themavericksindia.com", "riya@themavericksindia.com"],
  ["vibhuti@themavericksindia.com", "kashish@themavericksindia.com"],
  ["mitali.p@themavericksindia.com", "manaswi@themavericksindia.com"],
  ["vibhuti@themavericksindia.com", "kavita@themavericksindia.com"],
  ["alisha@themavericksindia.com", "avarna@themavericksindia.com"],
  ["srishtee@themavericksindia.com", "grishma@themavericksindia.com"],
  ["ila@themavericksindia.com", "manvi@themavericksindia.com"],
  ["chetan@themavericksindia.com", "pooja@themavericksindia.com"],
  ["mahek@themavericksindia.com", "varun@themavericksindia.com"],
  ["shrestha@themavericksindia.com", "tonmoyee@themavericksindia.com"],
  ["shrestha@themavericksindia.com", "rishika@themavericksindia.com"],
  ["rajvi@themavericksindia.com", "laveena@themavericksindia.com"],
  ["chetan@themavericksindia.com", "gaurav@themavericksindia.com"],
  ["archana@themavericksindia.com", "akshay@themavericksindia.com"],
  ["smriti@themavericksindia.com", "ila@themavericksindia.com"],
  ["chetan@themavericksindia.com", "aashna@themavericksindia.com"],
  ["ananya@themavericksindia.com", "sushant@themavericksindia.com"],
  ["gaurav@themavericksindia.com", "anil@themavericksindia.com"],
  ["muskaan@themavericksindia.com", "snigdha@themavericksindia.com"],
  ["chetan@themavericksindia.com", "avinash@themavericksindia.com"],
  ["akshay@themavericksindia.com", "rohan.jolly@themavericksindia.com"],
  ["smriti@themavericksindia.com", "shrestha@themavericksindia.com"],
  ["chhavi.a@themavericksindia.com", "harshita@themavericksindia.com"],
  ["anil@themavericksindia.com", "drishti.c@themavericksindia.com"],
  ["ila@themavericksindia.com", "ritik@themavericksindia.com"],
  ["pavithra@themavericksindia.com", "sanya.p@themavericksindia.com"],
  ["smriti@themavericksindia.com", "alisha@themavericksindia.com"],
  ["anil@themavericksindia.com", "ananya@themavericksindia.com"],
  ["pavithra@themavericksindia.com", "priyadarshini@themavericksindia.com"],
  ["chetan@themavericksindia.com", "smriti@themavericksindia.com"],
  ["archana@themavericksindia.com", "triyanshi@themavericksindia.com"],
  ["shrestha@themavericksindia.com", "mansi@themavericksindia.com"],
  ["chetan@themavericksindia.com", "archana@themavericksindia.com"],
  ["chetan@themavericksindia.com", "mitali.p@themavericksindia.com"],
  ["archana@themavericksindia.com", "mahek@themavericksindia.com"],
  ["archana@themavericksindia.com", "jayeeta@themavericksindia.com"],
  ["smriti@themavericksindia.com", "pavithra@themavericksindia.com"],
  ["mitali.p@themavericksindia.com", "srishtee@themavericksindia.com"],
  ["smriti@themavericksindia.com", "chhavi.a@themavericksindia.com"],
  ["gaurav@themavericksindia.com", "aditya.s@themavericksindia.com"],
  ["smriti@themavericksindia.com", "brinda@themavericksindia.com"],
  ["samrat@themavericksindia.com", "kyle@themavericksindia.com"],
  ["mitali.p@themavericksindia.com", "vibhuti@themavericksindia.com"],
  ["avinash@themavericksindia.com", "shivani@themavericksindia.com"],
  ["gaurav@themavericksindia.com", "samrat@themavericksindia.com"],
  ["mitali.p@themavericksindia.com", "muskaan@themavericksindia.com"],
  ["smriti@themavericksindia.com", "khushi@themavericksindia.com"],
  ["archana@themavericksindia.com", "vanshika@themavericksindia.com"],
  ["srishtee@themavericksindia.com", "udita@themavericksindia.com"],
  ["vibhuti@themavericksindia.com", "harprateek@themavericksindia.com"],
  ["chetan@themavericksindia.com", "divyanshsharma@themavericksindia.com"],
  ["chetan@themavericksindia.com", "satyam.singh@themavericksindia.com"],
  ["chetan@themavericksindia.com", "arunkumar@themavericksindia.com"]
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
