import { Request, Response } from 'express';
import { getCoreMasterAllocations, exportCoreMasterAllocationsToExcel, updateUserSalary, updateClientBudgetAndCore } from '../services/financeService';

export const getFinanceMaster = async (req: Request, res: Response) => {
  const { month, group_bd, group_leave, group_internal } = req.query;

  if (!month) {
    return res.status(400).json({ error: 'Missing month' });
  }

  try {
    const data = await getCoreMasterAllocations({
      month: month as string,
      group_bd: group_bd === 'true',
      group_leave: group_leave === 'true',
      group_internal: group_internal === 'true'
    });
    res.json(data);
  } catch (error: any) {
    console.error('getFinanceMaster Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const exportFinanceMaster = async (req: Request, res: Response) => {
  const { month, group_bd, group_leave, group_internal, view_type } = req.query;

  if (!month) {
    return res.status(400).json({ error: 'Missing month' });
  }

  try {
    const workbook = await exportCoreMasterAllocationsToExcel({
      month: month as string,
      group_bd: group_bd === 'true',
      group_leave: group_leave === 'true',
      group_internal: group_internal === 'true',
      view_type: view_type as any
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Finance_Allocations_${month}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error('exportFinanceMaster Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const saveUserSalary = async (req: Request, res: Response) => {
  const { userId, salary } = req.body;

  if (!userId || salary === undefined) {
    return res.status(400).json({ error: 'Missing userId or salary' });
  }

  try {
    const data = await updateUserSalary(userId, Number(salary));
    res.json(data);
  } catch (error: any) {
    console.error('saveUserSalary Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const saveClientBudgetAndCore = async (req: Request, res: Response) => {
  const { clientId, budget, core } = req.body;

  if (!clientId || budget === undefined || core === undefined) {
    return res.status(400).json({ error: 'Missing clientId, budget, or core' });
  }

  try {
    const data = await updateClientBudgetAndCore(clientId, Number(budget), core as string);
    res.json(data);
  } catch (error: any) {
    console.error('saveClientBudgetAndCore Error:', error);
    res.status(500).json({ error: error.message });
  }
};
