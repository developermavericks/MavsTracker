import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://mavs-tracker.vercel.app/auth/callback'
);

export const fetchCalendarEvents = async (accessToken: string, startDate: string, endDate: string) => {
  oauth2Client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    // Grouping logic (similar to Apps Script)
    const buckets: Record<string, any> = {};

    for (const ev of events) {
      if (ev.start?.dateTime && ev.end?.dateTime) {
        const start = new Date(ev.start.dateTime);
        const end = new Date(ev.end.dateTime);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        const title = ev.summary || 'Untitled';
        const key = title.toLowerCase().trim();

        if (!buckets[key]) {
          buckets[key] = {
            title,
            hours: 0,
            count: 0,
            start: ev.start.dateTime,
            end: ev.end.dateTime,
          };
        }
        buckets[key].hours += duration;
        buckets[key].count += 1;
      }
    }

    return Object.values(buckets);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};
