
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zietxefeihshhevouudx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZXR4ZWZlaWhzaGhldm91dWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTcyMDUsImV4cCI6MjA5NDIzMzIwNX0.FwWfKK1BklcMZl-vcCK-xohLGtUfL9nOKnYuBcGyE0E');

async function check() {
  try {
    const month = '2026-05';
    const [weeklyLogs, monthlyLogs] = await Promise.all([
      supabase.from('allocations_weekly').select('user_id').gt('hours', 0).eq('month', month),
      supabase.from('allocations_monthly').select('user_id').gt('hours', 0).eq('month', month)
    ]);
    const allLogs = [...(weeklyLogs.data || []), ...(monthlyLogs.data || [])];
    const userIds = [...new Set(allLogs.map(l => l.user_id))];
    const { data: users } = await supabase.from('users').select('email').in('id', userIds);
    console.log('Active Emails for 2026-05:', users ? users.map(u => u.email) : []);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

check();
