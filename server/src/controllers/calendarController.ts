import { Request, Response } from 'express';
import { fetchCalendarEvents } from '../services/calendarService';

export const getMyEvents = async (req: Request, res: Response) => {
  const { accessToken, startDate, endDate } = req.query;

  if (!accessToken || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing accessToken, startDate, or endDate' });
  }

  try {
    const events = await fetchCalendarEvents(
      accessToken as string,
      startDate as string,
      endDate as string
    );
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
