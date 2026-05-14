export const calculateWeekCode = (month: string, startDate: string) => {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [Y, M] = month.split('-').map(Number);
  const startDay = new Date(startDate).getDate();
  
  // Logic from code.gs: weeks start at 1, 8, 15, 22, 29
  let wk = 1;
  if (startDay >= 29) wk = 5;
  else if (startDay >= 22) wk = 4;
  else if (startDay >= 15) wk = 3;
  else if (startDay >= 8) wk = 2;
  else wk = 1;

  return `${month}-Wk${wk}`;
};
