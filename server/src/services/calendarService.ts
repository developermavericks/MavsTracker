import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://mavs-tracker.vercel.app/auth/callback'
);

export const fetchCalendarEvents = async (accessToken: string, startDate: string, endDate: string) => {
  // Create a fresh client for every request to prevent token cross-talk
  const localOauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://mavs-tracker.vercel.app/auth/callback'
  );
  
  localOauth2Client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth: localOauth2Client });

  console.log(`📅 Fetching events from ${startDate} to ${endDate}`);

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log(`✅ Found ${events.length} raw events from Google`);
    
    const buckets: Record<string, any> = {};

    for (const ev of events) {
      // Support both timed events (dateTime) and all-day events (date)
      const startStr = ev.start?.dateTime || ev.start?.date;
      const endStr = ev.end?.dateTime || ev.end?.date;

      if (startStr && endStr) {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        // Skip events with 0 duration or invalid dates
        if (isNaN(duration) || duration <= 0) continue;

        const title = ev.summary || 'Untitled';
        const dateKey = start.toISOString().split('T')[0];
        const key = `${title.toLowerCase().trim()}_${dateKey}`;

        if (!buckets[key]) {
          buckets[key] = {
            title,
            hours: 0,
            count: 0,
            start: startStr,
            end: endStr,
          };
        }
        buckets[key].hours += duration;
        buckets[key].count += 1;
      }
    }

    const result = Object.values(buckets);
    console.log(`📊 Grouped into ${result.length} unique buckets`);
    return result;
  } catch (error) {
    console.error('❌ Error fetching calendar events:', error);
    throw error;
  }
};
