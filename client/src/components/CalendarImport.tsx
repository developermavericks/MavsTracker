'use client';

import { useState, useEffect } from 'react';
import { Calendar, Download, Check, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import SearchableSelect from '@/components/SearchableSelect';

interface CalendarEvent {
  id: string;
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

      // Automatically compute start and end date for the entire month
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr);
      const monthIndex = parseInt(monthStr) - 1;
      
      const startStr = `${yearStr}-${monthStr}-01`;
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const endStr = `${yearStr}-${monthStr}-${lastDay.toString().padStart(2, '0')}`;

      const response = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/calendar/events?accessToken=${googleToken}&startDate=${startStr}&endDate=${endStr}`
      );
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      // Find the 'Internal' client ID for default
      const internalClient = clients.find(c => c.name.toLowerCase() === 'internal');
      const fallbackClientId = internalClient?.id || ''; 

      // Initialize events with default client, category, and event title as notes
      const initializedEvents = data.map((ev: any, index: number) => {
        let bestMatch: typeof clients[0] | null = null;
        let maxMatchedWords = 0;

        for (const c of clients) {
          const clientNameLower = c.name.toLowerCase();
          const titleLower = ev.title.toLowerCase();

          // 1. Direct match gets highest priority
          if (titleLower.includes(clientNameLower)) {
            bestMatch = c;
            break;
          }

          // 2. Multi-word match (e.g. "Tech Catchup - Internal" matching "Internal Tech")
          // Split the client name into words of length > 1 (ignores "-" or single letters)
          const clientWords = clientNameLower.split(/[\s_\-\/]+/).filter(w => w.length > 1);
          if (clientWords.length > 0) {
            const matchingWords = clientWords.filter(word => titleLower.includes(word));
            
            // If ALL words of the client name exist in the event title
            if (matchingWords.length === clientWords.length) {
              // The client with the most matching words is the most specific match
              if (matchingWords.length > maxMatchedWords) {
                maxMatchedWords = matchingWords.length;
                bestMatch = c;
              }
            }
          }
        }

        return {
          ...ev,
          id: `${ev.title}_${ev.start}_${index}`,
          client_id: bestMatch ? bestMatch.id : fallbackClientId,
          category: '', // Empty default
          notes: ev.title // Default notes to event title
        };
      });

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
      const selected = events.filter(e => selectedEvents.has(e.id));
      
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
            end_date: event.end.split('T')[0],
            source: 'calendar'
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

  const toggleSelect = (id: string) => {
    const next = new Set(selectedEvents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEvents(next);
  };

  const updateEventDetails = (id: string, field: string, value: string) => {
    setEvents(prev => prev.map(ev => 
      ev.id === id ? { ...ev, [field]: value } : ev
    ));
  };

  const toggleSelectAll = () => {
    if (selectedEvents.size === events.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(events.map(e => e.id)));
    }
  };

  const dismissEvent = (id: string) => {
    setEvents(prev => prev.filter(ev => ev.id !== id));
    setSelectedEvents(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Selected Period</span>
            <span className="text-sm font-black text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm block">
              {new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button 
            onClick={handleFetch}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 h-[38px] lg:h-[42px]"
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
            <p className="text-slate-500 max-w-xs">{hasFetched ? "No events found for this month." : "Click fetch to see your calendar events."}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select/Deselect and Ignore Controls */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-4 py-2 rounded-xl transition-all border border-blue-100 flex items-center gap-1.5"
                >
                  {selectedEvents.size === events.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs font-semibold text-slate-400">
                  {selectedEvents.size} of {events.length} events selected
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to dismiss all selected events?')) {
                     const selectedIds = new Set(selectedEvents);
                     setEvents(prev => prev.filter(ev => !selectedIds.has(ev.id)));
                     setSelectedEvents(new Set());
                  }
                }}
                disabled={selectedEvents.size === 0}
                className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/70 px-4 py-2 rounded-xl transition-all border border-red-100 disabled:opacity-50 flex items-center gap-1.5"
              >
                Dismiss Selected
              </button>
            </div>

            {events.map((event) => (
              <div 
                key={event.id}
                onClick={() => toggleSelect(event.id)}
                className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col gap-4 ${selectedEvents.has(event.id) ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${selectedEvents.has(event.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{event.title}</h4>
                      <p className="text-xs text-slate-500">
                        <span className="font-bold text-blue-600 mr-2">
                          {new Date(event.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        • {event.count} {event.count === 1 ? 'meeting' : 'meetings'} • {event.hours.toFixed(2)}h total
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className="text-sm font-mono font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100">{event.hours.toFixed(2)}h</span>
                    <button
                      type="button"
                      onClick={() => dismissEvent(event.id)}
                      className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-all border border-slate-100 hover:border-red-100"
                      title="Dismiss Event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedEvents.has(event.id) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Client</label>
                      <SearchableSelect 
                        options={clients.map(c => ({ value: c.id, label: c.name }))}
                        value={event.client_id || ''}
                        onChange={(val) => updateEventDetails(event.id, 'client_id', val)}
                        placeholder="Select Client"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Category</label>
                      <input type="text" value={event.category} onChange={(e) => updateEventDetails(event.id, 'category', e.target.value)} placeholder="Meeting / Internal / Billable" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Notes (Optional)</label>
                      <input type="text" value={event.notes} onChange={(e) => updateEventDetails(event.id, 'notes', e.target.value)} placeholder="Notes" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none" />
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
