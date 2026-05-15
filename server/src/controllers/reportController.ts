import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { getMasterReportData } from '../services/reportService';
import { exportMasterReportToExcel } from '../services/excelService';

export const getMasterReport = async (req: Request, res: Response) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ error: 'Missing month' });
  }

  try {
    const reportData = await getMasterReportData(month as string);
    res.json(reportData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const exportReport = async (req: Request, res: Response) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ error: 'Missing month' });
  }

  try {
    const workbook = await exportMasterReportToExcel(month as string);
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Master_Allocations_${month}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getClientSummary = async (req: Request, res: Response) => {
  const { month, view = 'weekly' } = req.query;

  if (!month) {
    return res.status(400).json({ error: 'Missing month' });
  }

  try {
    const data = await (require('../services/reportService').getClientSummary(month as string, view as any));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getClientRoster = async (req: Request, res: Response) => {
  const { month, clientName, view = 'weekly' } = req.query;

  if (!month || !clientName) {
    return res.status(400).json({ error: 'Missing month or clientName' });
  }

  try {
    const data = await (require('../services/reportService').getClientRoster(month as string, clientName as string, view as any));
    res.json(data);
  }
};

export const getMemberReport = async (req: Request, res: Response) => {
  const { email, month } = req.query;
  if (!email || !month) return res.status(400).json({ error: 'Missing email or month' });

  const cleanEmail = (email as string).trim();

  try {
    // 1. Get User ID from email first
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', cleanEmail)
      .single();

    if (userError || !user) {
      return res.json({ allocations: [] });
    }

    // 2. Get allocations for that specific user_id
    const { data: allocations, error } = await supabase
      .from('allocations_weekly')
      .select('id, user_id, month, client_id, category, hours, notes, start_date, end_date, week_code, source, clients(name)')
      .eq('user_id', user.id)
      .eq('month', month);

    if (error) throw error;
    res.json({ allocations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getActiveEmails = async (req: Request, res: Response) => {
  const { month } = req.query;
  try {
    // Get all user_ids who have logged time this month
    const { data: logs, error } = await supabase
      .from('allocations_weekly')
      .select('user_id')
      .eq('month', month);

    if (error) throw error;
    const userIds = [...new Set((logs || []).map(l => l.user_id))];

    if (userIds.length === 0) return res.json([]);

    // Fetch emails for those user_ids
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('email')
      .in('id', userIds);

    if (userError) throw userError;
    const emails = users.map(u => u.email);
    res.json(emails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
