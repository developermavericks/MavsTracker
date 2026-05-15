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
        .select('*, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);
    } else {
      query = supabase
        .from('allocations_weekly')
        .select('*, clients(name)')
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

export const addMonthlyAllocation = async (req: Request, res: Response) => {
  const { user_id, month, client_id, category, hours, notes } = req.body;

  try {
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
  const { user_id, month, client_id, category, hours, notes, start_date, end_date, force } = req.body;

  try {
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
    // 1. Fetch existing overlaps
    const { data: existing, error: checkError } = await supabase
      .from('allocations_weekly')
      .select('*, clients(name)')
      .eq('user_id', user_id)
      .filter('start_date', 'lte', end_date)
      .filter('end_date', 'gte', start_date);

    if (checkError) throw checkError;

    if (existing && existing.length > 0) {
      // 2. Check for blocking overlaps (Same client + same notes)
      const hasBlockingOverlap = existing.some(entry => 
        entry.client_id === client_id && entry.notes === notes
      );

      if (hasBlockingOverlap) {
        return res.status(409).json({ 
          error: 'Blocking overlap: Same client and notes already exist in this period.', 
          existing 
        });
      }

      // 3. If not blocking but force is false, return warning
      if (!force) {
        return res.status(409).json({ 
          error: 'Overlap detected', 
          existing 
        });
      }
    }

    // 4. Proceed with insertion
    const week_code = calculateWeekCode(month, start_date);
    const { data, error } = await supabase
      .from('allocations_weekly')
      .insert([{ user_id, month, client_id, category, hours, notes, start_date, end_date, week_code }])
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

  try {
    const table = kind === 'projected' ? 'allocations_monthly' : 'allocations_weekly';
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

  try {
    const table = kind === 'projected' ? 'allocations_monthly' : 'allocations_weekly';
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
        .select('*, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);
    } else {
      query = supabase
        .from('allocations_weekly')
        .select('*, clients(name)')
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
