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
