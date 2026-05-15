'use client';

import { useState, useEffect } from 'react';
import { Calendar, Download, Check, AlertCircle, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

interface CalendarEvent {
  title: string;
  hours: number;
  count: number;
  start: string;
  end: string;
  client_id?: string;
  category?: string;
  notes?: string;
}

export default function CalendarImport({ userId, month, onSuccess }: { userId: string, month: string, onSuccess: () => void }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  
  const [startDate, setStartDate] = useState(`${month}-01`);
  const [endDate, setEndDate] = useState(`${month}-31`);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchClients();
  }, []);

  useEffect(() => {
    setStartDate(`${month}-01`);
    setEndDate(`${month}-31`);
  }, [month]);

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/calendar/events?accessToken=${googleToken}&startDate=${startDate}&endDate=${endDate}`
      );
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      // Find the 'Internal' client ID for default
      const internalClient = clients.find(c => c.name.toLowerCase() === 'internal');
      const defaultClientId = internalClient?.id || ''; 

      // Initialize events with default client, category, and empty notes
      const initializedEvents = data.map((ev: any) => ({
        ...ev,
        client_id: defaultClientId,
        category: '', // Empty default
        notes: '' 
      }));

      setEvents(initializedEvents);
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
      
      if (selected.length === 0) return;

      const missingClient = selected.find(e => !e.client_id);
      if (missingClient) {
        throw new Error(`Please select a client for "${missingClient.title}" before saving.`);
      }

      for (const event of selected) {
        const { error } = await supabase
          .from('allocations_weekly')
          .insert([{
            user_id: userId,
            month,
            client_id: event.client_id, 
            category: event.category,
            hours: event.hours,
            notes: event.notes || '', 
            start_date: event.start.split('T')[0],
            end_date: event.end.split('T')[0]
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

  const updateEventDetails = (title: string, field: string, value: string) => {
    setEvents(prev => prev.map(ev => 
      ev.title === title ? { ...ev, [field]: value } : ev
    ));
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-end justify-between bg-blue-50/30 gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Calendar Import</h3>
            <p className="text-sm text-slate-500">Fetch and customize your meetings.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1">From</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-40"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1">To</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-40"
              />
            </div>
          </div>
          <button 
            onClick={handleFetch}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 h-[42px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch Events'}
          </button>
        </div>
      </div>

      <div className="p-8">
        {events.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="p-4 bg-slate-50 rounded-full mb-4">
              {hasFetched ? <AlertCircle className="w-8 h-8 text-amber-500" /> : <Download className="w-8 h-8 text-slate-300" />}
            </div>
            <p className="text-slate-500 max-w-xs">{hasFetched ? "No events found for these dates." : "Click fetch to see your calendar events."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div 
                key={event.title}
                onClick={() => toggleSelect(event.title)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col gap-4 ${selectedEvents.has(event.title) ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
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
                    <span className="text-sm font-mono font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100">{event.hours.toFixed(2)}h</span>
                  </div>
                </div>

                {selectedEvents.has(event.title) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Client</label>
                      <select 
                        value={event.client_id}
                        onChange={(e) => {
                          updateEventDetails(event.title, 'client_id', e.target.value);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Category</label>
                      <input type="text" value={event.category} onChange={(e) => updateEventDetails(event.title, 'category', e.target.value)} placeholder="Meeting / Internal / Billable" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Notes (Optional)</label>
                      <input type="text" value={event.notes} onChange={(e) => updateEventDetails(event.title, 'notes', e.target.value)} placeholder="Notes" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                    </div>
                  </div>
                )}
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
