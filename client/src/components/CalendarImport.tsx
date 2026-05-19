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
  isCustomBd?: boolean;
  customBdName?: string;
}

export default function CalendarImport({ userId, month, onSuccess }: { userId: string, month: string, onSuccess: () => void }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [startDate, setStartDate] = useState(() => `${month}-01`);
  const [endDate, setEndDate] = useState(() => {
    const [yr, mn] = month.split('-');
    const lastDay = new Date(parseInt(yr), parseInt(mn), 0).getDate();
    return `${month}-${lastDay.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    handleMonthChange(month);
  }, [month]);

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    if (value) {
      const [yr, mn] = value.split('-');
      const start = `${value}-01`;
      const lastDay = new Date(parseInt(yr), parseInt(mn), 0).getDate();
      const end = `${value}-${lastDay.toString().padStart(2, '0')}`;
      
      setStartDate(start);
      setEndDate(end);
    }
  };

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/calendar/events?accessToken=${googleToken}&startDate=${startDate}&endDate=${endDate}`
      );
      
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      // Find the 'Internal' client ID for default
      const internalClient = clients.find(c => c.name.toLowerCase() === 'internal');
      const fallbackClientId = internalClient?.id || ''; 

      // Initialize events with default client, category, and event title as notes
      const initializedEvents = data.map((ev: any, index: number) => {
        let bestMatch: typeof clients[0] | null = null;
        let bestScore = -1;

        const titleLower = ev.title.toLowerCase();

        for (const c of clients) {
          const clientNameLower = c.name.toLowerCase();
          
          let isMatch = false;
          let matchTypeWeight = 0; // 1000 for exact phrase, 500 for token-based

          // 1. Check exact phrase match
          if (titleLower.includes(clientNameLower)) {
            isMatch = true;
            matchTypeWeight = 1000;
          } else {
            // 2. Check token-based match (all words in client name are present in title)
            const clientWords = clientNameLower.split(/[\s_\-\/]+/).filter(w => w.length > 1);
            if (clientWords.length > 0) {
              const matchingWords = clientWords.filter(word => titleLower.includes(word));
              if (matchingWords.length === clientWords.length) {
                isMatch = true;
                matchTypeWeight = 500;
              }
            }
          }

          if (isMatch) {
            // Calculate Category Priority
            let categoryPriority = 100; // Default generic (Internal, LEAVE, etc.)
            
            const isGenericInternalOrLeave = [
              'internal', 'leave', 'free_time', 'free time', 'personal commitments'
            ].includes(clientNameLower) || clientNameLower.startsWith('group internal');

            const isSpecificInternal = clientNameLower.includes('internal') && !isGenericInternalOrLeave;

            const isBDClient = clientNameLower.startsWith('bd -') || clientNameLower.startsWith('bd ');
            const isGenericBD = clientNameLower === 'bd';

            if (isBDClient) {
              categoryPriority = 10000; // Highest priority for proper specific BD clients
            } else if (!isGenericInternalOrLeave && !isSpecificInternal && !isGenericBD) {
              categoryPriority = 5000;  // High priority for normal proper clients (e.g. Google)
            } else if (isGenericBD) {
              categoryPriority = 1000;  // Medium priority for generic BD
            } else if (isSpecificInternal) {
              categoryPriority = 500;   // Medium-low priority for specific internal groups
            }

            // Calculate overall score
            // Score = Category Priority + Match Type Weight + Length Specificity
            const score = categoryPriority + matchTypeWeight + (clientNameLower.length * 10);

            if (score > bestScore) {
              bestScore = score;
              bestMatch = c;
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

      const missingClient = selected.find(e => !e.isCustomBd && !e.client_id);
      if (missingClient) {
        throw new Error(`Please select a client for "${missingClient.title}" before saving.`);
      }

      const emptyCustomBd = selected.find(e => e.isCustomBd && !e.customBdName?.trim());
      if (emptyCustomBd) {
        throw new Error(`Please enter a BD client name for "${emptyCustomBd.title}".`);
      }

      const eventsToSave = [...selected];
      const updatedClientsList = [...clients];

      for (const event of eventsToSave) {
        if (event.isCustomBd) {
          const bdName = `BD - ${event.customBdName!.trim()}`;
          
          const createRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: bdName })
          });

          if (!createRes.ok) {
            const errData = await createRes.json();
            throw new Error(errData.error || `Failed to create client "${bdName}"`);
          }

          const newClient = await createRes.json();
          event.client_id = newClient.id;

          if (!updatedClientsList.some(c => c.id === newClient.id)) {
            updatedClientsList.push(newClient);
          }
        }
      }

      // Sort and update the clients state so they immediately show in all dropdowns
      updatedClientsList.sort((a, b) => a.name.localeCompare(b.name));
      setClients(updatedClientsList);

      for (const event of eventsToSave) {
        const { error } = await supabase
          .from('allocations_weekly')
          .insert([{
            user_id: userId,
            month: selectedMonth,
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
      {/* Title & Icon Header Band */}
      <div className="p-8 pb-6 border-b border-slate-100 bg-blue-50/20 flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-2xl">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Calendar Import</h3>
          <p className="text-sm text-slate-500">Fetch and customize your meetings.</p>
        </div>
      </div>
      
      {/* Aligned Controls Action Band */}
      <div className="px-8 py-5 bg-slate-50/40 border-b border-slate-100 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Selected Month Selector */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Selected Month</span>
            <div className="flex bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[38px] lg:h-[42px] items-center">
               <select 
                 value={selectedMonth.split('-')[1]} 
                 onChange={(e) => {
                   const newMonth = e.target.value;
                   const year = selectedMonth.split('-')[0];
                   handleMonthChange(`${year}-${newMonth}`);
                 }}
                 className="pl-4 pr-2 py-2 text-sm font-bold text-slate-900 bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
               >
                 {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                   <option key={m} value={m}>{new Date(2025, parseInt(m)-1).toLocaleString('en-US', { month: 'short' })}</option>
                 ))}
               </select>
               <div className="w-[1px] bg-slate-200 h-5 my-auto" />
               <select 
                 value={selectedMonth.split('-')[0]} 
                 onChange={(e) => {
                   const newYear = e.target.value;
                   const mon = selectedMonth.split('-')[1];
                   handleMonthChange(`${newYear}-${mon}`);
                 }}
                 className="pl-2 pr-4 py-2 text-sm font-bold text-blue-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
               >
                 {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                   <option key={y} value={y}>{y}</option>
                 ))}
               </select>
            </div>
          </div>

          {/* Date Picker inputs (From / To) */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">From</span>
              <input 
                type="date" 
                value={startDate}
                min={`${selectedMonth}-01`}
                max={`${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate().toString().padStart(2, '0')}`}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none w-36 lg:w-40 shadow-sm h-[38px] lg:h-[42px] cursor-pointer"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5">To</span>
              <input 
                type="date" 
                value={endDate}
                min={`${selectedMonth}-01`}
                max={`${selectedMonth}-${new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate().toString().padStart(2, '0')}`}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none w-36 lg:w-40 shadow-sm h-[38px] lg:h-[42px] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Fetch Action Button */}
        <div className="flex flex-col w-full md:w-auto mt-2 md:mt-0">
          <button 
            onClick={handleFetch}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 h-[38px] lg:h-[42px] w-full md:w-auto"
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
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client</label>
                        <button
                          type="button"
                          onClick={() => {
                            const isCustom = !event.isCustomBd;
                            setEvents(prev => prev.map(ev => 
                              ev.id === event.id 
                                ? { ...ev, isCustomBd: isCustom, customBdName: isCustom ? '' : undefined } 
                                : ev
                            ));
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          {event.isCustomBd ? "Select Existing" : "Add as BD"}
                        </button>
                      </div>

                      {event.isCustomBd ? (
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">BD -</span>
                          <input 
                            type="text" 
                            value={event.customBdName || ''} 
                            onChange={(e) => updateEventDetails(event.id, 'customBdName', e.target.value)} 
                            placeholder="Client Name" 
                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 h-[38px]"
                          />
                        </div>
                      ) : (
                        <SearchableSelect 
                          options={clients.map(c => ({ value: c.id, label: c.name }))}
                          value={event.client_id || ''}
                          onChange={(val) => updateEventDetails(event.id, 'client_id', val)}
                          placeholder="Select Client"
                          className="text-xs"
                        />
                      )}
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
