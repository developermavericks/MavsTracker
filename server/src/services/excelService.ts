import ExcelJS from 'exceljs';
import { getMasterReportData } from './reportService';

export const exportMasterReportToExcel = async (month: string) => {
  const data = await getMasterReportData(month);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Master Allocations');

  // Header 1: Core Groupings
  const header1 = ['Member'];
  data.clients.forEach(client => {
    header1.push('Core'); // Placeholder for core grouping if needed
  });
  worksheet.addRow(header1);

  // Header 2: Client Names
  const header2 = ['Member', ...data.clients];
  worksheet.addRow(header2);

  // Data Rows
  data.rows.forEach((row: any) => {
    const excelRow = [row.name || row.email];
    data.clients.forEach(client => {
      excelRow.push(row.allocations[client] || '');
    });
    worksheet.addRow(excelRow);
  });

  // Formatting
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(2).font = { bold: true };
  worksheet.getColumn(1).width = 25;
  data.clients.forEach((_, i) => {
    worksheet.getColumn(i + 2).width = 15;
  });

  return workbook;
};

export const exportUserAllocationsToExcel = async (userId: string, month: string, kind: 'projected' | 'weekly', data: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheetName = kind === 'projected' ? 'Monthly Projected' : 'Weekly Actuals';
  const worksheet = workbook.addWorksheet(sheetName);

  // Set Columns
  const columns = [
    { header: 'Period', key: 'period', width: 25 },
    { header: 'Client', key: 'client', width: 20 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Hours', key: 'hours', width: 10 },
    { header: 'Notes', key: 'notes', width: 40 }
  ];
  worksheet.columns = columns;

  // Add Data
  data.forEach(item => {
    worksheet.addRow({
      period: kind === 'weekly' ? `${item.start_date} - ${item.end_date}` : item.month,
      client: item.clients?.name || 'N/A',
      category: item.category,
      hours: item.hours,
      notes: item.notes
    });
  });

  // Formatting
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  return workbook;
};
