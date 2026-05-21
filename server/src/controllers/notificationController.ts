import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { isActiveUser } from '../config/activeUsers';
import { sendReminderEmail, sendBulkReminderEmails } from '../services/emailService';

export const sendIndividualReminder = async (req: Request, res: Response) => {
  const { email, month } = req.body;

  if (!email || !month) {
    return res.status(400).json({ error: 'Missing email or month.' });
  }

  try {
    // Fetch employee details from DB to get the name
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name')
      .ilike('email', email.trim())
      .maybeSingle();

    if (userError) throw userError;

    const name = user?.name || email.split('@')[0];
    const emailResult = await sendReminderEmail(email.trim(), name, month);

    res.json({ message: `Successfully sent reminder to ${email}`, result: emailResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const sendAllReminders = async (req: Request, res: Response) => {
  const { month } = req.body;

  if (!month) {
    return res.status(400).json({ error: 'Missing month.' });
  }

  try {
    // 1. Fetch all users
    const { data: dbUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, exit_date');

    if (usersError) throw usersError;

    // 2. Fetch logged user IDs for this month
    const fetchActiveUserIds = async (table: string) => {
      let ids: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('user_id')
          .gt('hours', 0)
          .eq('month', month)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        ids = ids.concat(data);
        if (data.length < pageSize) break;
        page++;
      }
      return ids;
    };

    const [weeklyLogs, monthlyLogs] = await Promise.all([
      fetchActiveUserIds('allocations_weekly'),
      fetchActiveUserIds('allocations_monthly')
    ]);

    const activeUserIds = new Set([...weeklyLogs, ...monthlyLogs].map(l => l.user_id));

    // 3. Filter to find the zero-hour members
    const zeroHourMembersList = dbUsers
      .filter((u: any) => {
        // Must match the active user domains filter (e.g. @themavericksindia.com)
        if (!isActiveUser(u.email)) return false;
        
        // Exclude if exited before the target month
        if (u.exit_date) {
          const exitMonth = u.exit_date.substring(0, 7);
          if (exitMonth < month) return false;
        }

        // Exclude if they have logged hours (> 0) this month
        if (activeUserIds.has(u.id)) return false;

        return true;
      })
      .map((u: any) => ({
        email: u.email.toLowerCase(),
        name: u.name || u.email.split('@')[0]
      }));

    if (zeroHourMembersList.length === 0) {
      return res.json({ message: 'No zero-hour members found to remind.' });
    }

    // 4. Send bulk emails smoothly with delay
    const results = await sendBulkReminderEmails(zeroHourMembersList, month);

    res.json({
      message: `Successfully processed reminder emails for ${zeroHourMembersList.length} members.`,
      results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const sendClosureReminders = async (req: Request, res: Response) => {
  const { month } = req.body;

  if (!month) {
    return res.status(400).json({ error: 'Missing month.' });
  }

  try {
    // 1. Fetch all users
    const { data: dbUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, exit_date');

    if (usersError) throw usersError;

    // 2. Fetch logged user IDs for this month
    const fetchActiveUserIds = async (table: string) => {
      let ids: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select('user_id')
          .gt('hours', 0)
          .eq('month', month)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) break;
        ids = ids.concat(data);
        if (data.length < pageSize) break;
        page++;
      }
      return ids;
    };

    const [weeklyLogs, monthlyLogs] = await Promise.all([
      fetchActiveUserIds('allocations_weekly'),
      fetchActiveUserIds('allocations_monthly')
    ]);

    const activeUserIds = new Set([...weeklyLogs, ...monthlyLogs].map(l => l.user_id));

    // 3. Filter to find the zero-hour members
    const zeroHourMembersList = dbUsers
      .filter((u: any) => {
        // Must match the active user domains filter (e.g. @themavericksindia.com)
        if (!isActiveUser(u.email)) return false;
        
        // Exclude if exited before the target month
        if (u.exit_date) {
          const exitMonth = u.exit_date.substring(0, 7);
          if (exitMonth < month) return false;
        }

        // Exclude if they have logged hours (> 0) this month
        if (activeUserIds.has(u.id)) return false;

        return true;
      })
      .map((u: any) => ({
        email: u.email.toLowerCase(),
        name: u.name || u.email.split('@')[0]
      }));

    if (zeroHourMembersList.length === 0) {
      return res.json({ message: 'No zero-hour members found for closure warning.' });
    }

    // 4. Send bulk emails smoothly with delay (isClosureWarning = true)
    const results = await sendBulkReminderEmails(zeroHourMembersList, month, true);

    res.json({
      message: `Successfully processed closure warning emails for ${zeroHourMembersList.length} members.`,
      results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
