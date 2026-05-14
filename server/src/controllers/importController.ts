import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { supabase } from '../config/supabase';
import { calculateWeekCode } from '../utils/dateUtils';

export const importExcel = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { user_id, month, type } = req.body;
  const workbook = new ExcelJS.Workbook();
  
  try {
    await workbook.xlsx.load(req.file.buffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new Error('Worksheet not found');

    const rows: any[] = [];
    const clientMap: Record<string, string> = {};

    // 1. Pre-fetch or create clients
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const clientName = row.getCell(1).text?.trim();
      if (clientName && !clientMap[clientName.toLowerCase()]) {
        // Check if client exists
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('name', clientName)
          .single();
        
        if (existing) {
          clientMap[clientName.toLowerCase()] = existing.id;
        } else {
          const { data: created } = await supabase
            .from('clients')
            .insert([{ name: clientName }])
            .select()
            .single();
          if (created) clientMap[clientName.toLowerCase()] = created.id;
        }
      }
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const clientName = row.getCell(1).text?.trim();
      const category = row.getCell(2).text;
      const hours = parseFloat(row.getCell(3).text);
      const notes = row.getCell(4).text;
      const startDate = row.getCell(5).text;
      const endDate = row.getCell(6).text;

      if (clientName && !isNaN(hours)) {
        const client_id = clientMap[clientName.toLowerCase()];
        const entry: any = {
          user_id,
          month,
          client_id,
          category,
          hours,
          notes,
        };

        if (type === 'weekly') {
          entry.start_date = startDate || null;
          entry.end_date = endDate || null;
          if (startDate) {
            entry.week_code = calculateWeekCode(month, startDate);
          }
        }

        rows.push(entry);
      }
    });

    const table = type === 'projected' ? 'allocations_monthly' : 'allocations_weekly';
    const { error } = await supabase.from(table).insert(rows);

    if (error) throw error;

    res.json({ message: `Successfully imported ${rows.length} entries` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
