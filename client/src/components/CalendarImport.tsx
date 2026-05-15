'use client';

import { useState, useEffect } from 'react';
import { Calendar, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

interface CalendarEvent {
  title: string;
  hours: number;
  count: number;
  start: string;
  end: string;
}

export default function CalendarImport({ userId, month, onSuccess }: { userId: string, month: string, onSuccess: () => void }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const [clients, setClients] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`);
      const data = await response.json();
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const handleLoginRefresh = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly'
      },
    });
  };

  const handleFetch = async () => {
    setLoading(true);
    setHasFetched(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const googleToken = session?.provider_token;
      
      if (!googleToken) {
        setLoading(false);
        if (confirm('🚨 Your Google Session has expired. Would you like to refresh it now to fetch calendar events?')) {
          handleLoginRefresh();
        }
        return;
      }

      const response = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/calendar/events?accessToken=${googleToken}&startDate=${month}-01&endDate=${month}-31`
      );
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      setEvents(data);
      setHasFetched(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selected = events.filter(e => selectedEvents.has(e.title));
      
      // Find the 'Internal' client ID
      let internalClient = clients.find(c => c.name.toLowerCase() === 'internal');
      
      // Fallback: if no 'Internal' exists, use the first client available
      if (!internalClient && clients.length > 0) {
        internalClient = clients[0];
      }

      if (!internalClient) {
        throw new Error("No clients found in database. Please add a client first.");
      }

      for (const event of selected) {
        const { error } = await supabase
          .from('allocations_weekly')
          .insert([{
            user_id: userId,
            month,
            client_id: internalClient.id, // Using real UUID now
            category: 'Meeting',
            hours: event.hours,
            notes: `Imported from Calendar: ${event.title}`,
            start_date: event.start.split('T')[0],
            end_date: event.end.split('T')[0],
          }]);
        if (error) throw error;
      }
      onSuccess();
      setSelectedEvents(new Set());
      setEvents([]);
      setHasFetched(false);
      alert(`Successfully saved ${selected.length} events!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (title: string) => {
    const next = new Set(selectedEvents);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    setSelectedEvents(next);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Calendar Import</h3>
            <p className="text-sm text-slate-500">Automatically pull meetings from your Google Calendar.</p>
          </div>
        </div>
        <button 
          onClick={handleFetch}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
        >
          {loading ? 'Fetching...' : 'Fetch Events'}
        </button>
      </div>

      <div className="p-8">
        {events.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
              {hasFetched ? (
                <AlertCircle className="w-8 h-8 text-amber-500" />
              ) : (
                <Download className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <p className="text-slate-500 max-w-xs">
              {hasFetched 
                ? `No calendar events found for ${month}. Try selecting a different month.` 
                : "Click fetch to see your calendar events for this month."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div 
                key={event.title}
                onClick={() => toggleSelect(event.title)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedEvents.has(event.title) 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${selectedEvents.has(event.title) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{event.title}</h4>
                    <p className="text-xs text-slate-500">{event.count} meetings • {event.hours.toFixed(2)}h total</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Duration</span>
                  <span className="text-sm font-mono font-bold text-slate-900">{event.hours.toFixed(2)}h</span>
                </div>
              </div>
            ))}
            
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold">Overlap check enabled</span>
              </div>
              <button 
                onClick={handleSave}
                disabled={saving || selectedEvents.size === 0}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : `Save ${selectedEvents.size} Events`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
