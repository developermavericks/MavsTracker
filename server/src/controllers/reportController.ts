import { Request, Response } from 'express';
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
