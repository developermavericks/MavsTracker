import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { calculateWeekCode } from '../utils/dateUtils';
import { exportUserAllocationsToExcel } from '../services/excelService';

export const getMyAllocations = async (req: Request, res: Response) => {
  const { userId, month, kind } = req.query;

  if (!userId || !month) {
    return res.status(400).json({ error: 'Missing userId or month' });
  }

  try {
    let query;
    if (kind === 'projected') {
      query = supabase
        .from('allocations_monthly')
        .select('id, user_id, month, client_id, category, hours, notes, source, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);
    } else {
      query = supabase
        .from('allocations_weekly')
        .select('id, user_id, month, client_id, category, hours, notes, start_date, end_date, week_code, source, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const checkIfMonthLocked = async (month: string, userRole: string): Promise<boolean> => {
  // 1. Core users are NEVER locked out
  // Core users are subject to the same lock rules as others; they can unlock via unlocked_months table

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return false;
  }

  const [targetYear, targetMonth] = month.split('-').map(Number);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentDay = now.getDate();
  
  const diffMonths = (currentYear * 12 + currentMonth) - (targetYear * 12 + targetMonth);
  
  if (diffMonths <= 0) {
    // Current or future month: never locked
    return false;
  }
  
  if (diffMonths === 1) {
    // Immediate previous month: lock only if current day is 5 or later
    if (currentDay < 5) {
      return false;
    }
  }
  
  // 2. Older months (diffMonths > 1) or past-5th previous month: check if explicitly unlocked
  try {
    const { data, error } = await supabase
      .from('unlocked_months')
      .select('month')
      .eq('month', month)
      .maybeSingle();
    
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('[LOCK] "unlocked_months" table is missing in database. Please run the SQL schema in Supabase Dashboard SQL Editor.');
        return true;
      }
    }
    
    if (data && !error) {
      // Month is explicitly unlocked!
      return false;
    }
  } catch (err) {
    console.error('Error checking unlocked_months:', err);
  }

  return true;
};

export const addMonthlyAllocation = async (req: Request, res: Response) => {
  const { user_id, month, client_id, category, hours, notes } = req.body;
  const userRole = (req as any).user_role || 'team';

  try {
    // Check lock
    const isLocked = await checkIfMonthLocked(month, userRole);
    if (isLocked) {
      return res.status(403).json({ error: `This month (${month}) is locked for editing.` });
    }

    // Check monthly cap
    const { data: existingMonthly, error: mError } = await supabase
      .from('allocations_monthly')
      .select('hours')
      .eq('user_id', user_id)
      .eq('month', month);
    
    const { data: existingWeekly, error: wError } = await supabase
      .from('allocations_weekly')
      .select('hours')
      .eq('user_id', user_id)
      .eq('month', month);

    if (mError || wError) throw (mError || wError);

    const totalHours = [...(existingMonthly || []), ...(existingWeekly || [])]
      .reduce((acc, curr) => acc + Number(curr.hours), 0);

    if (totalHours + Number(hours) > 160) {
      return res.status(400).json({ error: `Monthly cap exceeded. Current total: ${totalHours}h. Adding ${hours}h would exceed 160h.` });
    }
    const { data, error } = await supabase
      .from('allocations_monthly')
      .insert([{ user_id, month, client_id, category, hours, notes }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addWeeklyAllocation = async (req: Request, res: Response) => {
  const { user_id, month, client_id, category, hours, notes, start_date, end_date, source } = req.body;
  const userRole = (req as any).user_role || 'team';

  try {
    // Debug log role and month
    console.log('[LOCK] Checking lock for month', month, 'role', userRole);
    // Check lock
    const isLocked = await checkIfMonthLocked(month, userRole);
    if (isLocked) {
      return res.status(403).json({ error: `This month (${month}) is locked for editing.` });
    }

    // Check monthly cap
    const { data: existingMonthly, error: mError } = await supabase
      .from('allocations_monthly')
      .select('hours')
      .eq('user_id', user_id)
      .eq('month', month);
    
    const { data: existingWeekly, error: wError } = await supabase
      .from('allocations_weekly')
      .select('hours')
      .eq('user_id', user_id)
      .eq('month', month);

    if (mError || wError) throw (mError || wError);

    const totalHours = [...(existingMonthly || []), ...(existingWeekly || [])]
      .reduce((acc, curr) => acc + Number(curr.hours), 0);

    if (totalHours + Number(hours) > 160) {
      return res.status(400).json({ error: `Monthly cap exceeded. Current total: ${totalHours}h. Adding ${hours}h would exceed 160h.` });
    }

    // Proceed with insertion, include source if provided
    const week_code = calculateWeekCode(month, start_date);
    const insertPayload: any = { user_id, month, client_id, category, hours, notes, start_date, end_date, week_code };
    if (source) insertPayload.source = source;
    const { data, error } = await supabase
      .from('allocations_weekly')
      .insert([insertPayload])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



export const deleteAllocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { kind } = req.query;
  const userRole = (req as any).user_role || 'team';

  try {
    const table = kind === 'projected' ? 'allocations_monthly' : 'allocations_weekly';
    
    // Fetch month first to verify lock
    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select('month')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !record) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    const isLocked = await checkIfMonthLocked(record.month, userRole);
    if (isLocked) {
      return res.status(403).json({ error: `This month (${record.month}) is locked for editing.` });
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAllocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { kind, ...updates } = req.body;
  const userRole = (req as any).user_role || 'team';

  try {
    const table = kind === 'projected' ? 'allocations_monthly' : 'allocations_weekly';

    // Fetch month first to verify lock
    const { data: record, error: fetchError } = await supabase
      .from(table)
      .select('month')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !record) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    const isLocked = await checkIfMonthLocked(record.month, userRole);
    if (isLocked) {
      return res.status(403).json({ error: `This month (${record.month}) is locked for editing.` });
    }

    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const exportMyAllocations = async (req: Request, res: Response) => {
  const { userId, month, kind } = req.query;

  if (!userId || !month) {
    return res.status(400).json({ error: 'Missing userId or month' });
  }

  try {
    let query;
    if (kind === 'projected') {
      query = supabase
        .from('allocations_monthly')
        .select('id, user_id, month, client_id, category, hours, notes, source, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);
    } else {
      query = supabase
        .from('allocations_weekly')
        .select('id, user_id, month, client_id, category, hours, notes, start_date, end_date, week_code, source, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);
    }

    const { data, error } = await query;
    if (error) throw error;

    const workbook = await exportUserAllocationsToExcel(userId as string, month as string, kind as any, data || []);
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=My_Allocations_${month}_${kind}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUnlockedMonths = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('unlocked_months')
      .select('*')
      .order('month', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('[API] unlocked_months table is missing from Supabase database.');
        return res.json([]);
      }
      throw error;
    }
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addUnlockedMonth = async (req: Request, res: Response) => {
  const { month } = req.body;
  const userRole = (req as any).user_role || 'team';

  if (userRole !== 'core') {
    return res.status(403).json({ error: 'Access denied: Core role required' });
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM.' });
  }

  try {
    const { data, error } = await supabase
      .from('unlocked_months')
      .upsert([{ month }])
      .select();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return res.status(400).json({ 
          error: 'The "unlocked_months" table is missing from the database. Please run the SQL schema in Supabase Dashboard SQL Editor first.' 
        });
      }
      throw error;
    }
    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteUnlockedMonth = async (req: Request, res: Response) => {
  const { month } = req.params;
  const userRole = (req as any).user_role || 'team';

  if (userRole !== 'core') {
    return res.status(403).json({ error: 'Access denied: Core role required' });
  }

  try {
    const { error } = await supabase
      .from('unlocked_months')
      .delete()
      .eq('month', month);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return res.status(400).json({ 
          error: 'The "unlocked_months" table is missing from the database. Please run the SQL schema in Supabase Dashboard SQL Editor first.' 
        });
      }
      throw error;
    }
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
