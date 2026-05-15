const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Using ANON key - Note: This requires the 'clients' table to have DELETE/INSERT permissions for anon role or the service role key.
// Since we are running locally, we will attempt to use the keys from .env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const clientList = [
  "Sense AI", "Shubhanshu", "Straive", "TrueFan AI", "Truworth", "Udaiti", "Udhyam", "Vivo", "Wadhwani", "Zeno", 
  "iCreate", "mPokket", "FREE_TIME", "LEAVE", "BD", "Personal Commitments", "Internal - CS", "Internal HR", 
  "Internal Tech", "Internal Finance", "Internal Creative", "Internal Marketing", "Internal Training", 
  "Noise", "Nuuk", "Oister", "Omnicom Global Solutions", "Optiemus Infracom", "PMI", "PYT", "Paasa", 
  "PayGlocal", "Pearl Academy", "People Matters", "Pixxel", "Plaksha", "Plum", "QUBO (HEPL)", "Razorpay", 
  "Room to Read", "SCALE", "Scapia", "JCI", "JoshTalks", "MFF", "MSDF", "Merrakki", "Milliken", 
  "Modi Illva", "Murf AI", "Musashi", "Musashi-D", "NEC", "Chargezone (TECSO)", "Chupps", "Clinikally", 
  "College Vidya", "Crazzy Bosses", "Decentro", "Eruditus", "FACE", "FUJIFILM", "GNFZ", "Goldi Solar", 
  "Google", "GradRight", "Hasbro", "Haystack", "Inc.5", "Innover", "Bambrew", "CapitaLand", "Capital League", 
  "AVPN", "Adda Education", "Angara", "Aptiv", "Astra Security", "BCG", "BD - AECOM", "BD - Astrotalk", 
  "BD - Boston Scientific", "BD - Bright Money", "BD - CLI", "BD - Capitalmind", "BD - Caterpillar", 
  "BD - Chalet", "BD - Chorus", "BD - Griffith", "BD - IVCA", "BD - Infinite", "BD - JAR", "BD - Mahavir", 
  "BD - Mitsubishi", "BD - Panasonic", "BD - Peak XV", "BD - Qualcomm", "BD - Shadowfax", "BD - Shiprocket", 
  "BD - Simple Energy", "BD - UPgrad", "BD - WGT", "BD - YouTube", "BD - Zeta", "BD - Zeti", "BD - iTel", "BD - Eume"
];

async function updateClients() {
  console.log('🔄 Starting Client List Reset...');

  // 1. Fetch current clients
  const { data: currentClients } = await supabase.from('clients').select('id');
  
  if (currentClients && currentClients.length > 0) {
    console.log(`🗑️ Removing ${currentClients.length} old clients...`);
    // Note: If RLS prevents bulk delete, this might fail. 
    // We will attempt to delete via the IDs.
    for (const client of currentClients) {
        await supabase.from('clients').delete().eq('id', client.id);
    }
  }

  // 2. Insert new clients
  console.log(`📥 Inserting ${clientList.length} new clients...`);
  
  // Sorting for cleaner insertion (though DB will order by name anyway)
  const sortedList = [...new Set(clientList)].sort();

  for (const name of sortedList) {
    const { error } = await supabase.from('clients').insert([{ name }]);
    if (error) {
      console.error(`❌ Failed to add ${name}:`, error.message);
    } else {
      console.log(`✅ Added: ${name}`);
    }
  }

  console.log('✨ All done! Your dropdown is now updated.');
}

updateClients();
