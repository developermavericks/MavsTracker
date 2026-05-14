const ExcelJS = require('exceljs');
const path = require('path');

async function inspect() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(__dirname, 'Credentials (2) (1).xlsx'));
  
  console.log('Sheets:', workbook.worksheets.map(ws => ws.name));
  
  workbook.worksheets.forEach(ws => {
    console.log(`\nSheet: ${ws.name}`);
    const firstRow = ws.getRow(1);
    console.log('Headers:', firstRow.values.slice(1));
    const secondRow = ws.getRow(2);
    console.log('Sample Row 1:', secondRow.values.slice(1));
  });
}

inspect().catch(console.error);
