'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import SearchableSelect from '@/components/SearchableSelect';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'projected' | 'weekly';
  month: string;
  userId: string;
  onSuccess: () => void;
  onOverlap: (overlaps: any[], isBlocking: boolean, retryData: any) => void;
  initialData?: any;
  isEdit?: boolean;
}

export default function AddEntryModal({ 
  isOpen, onClose, type, month, userId, onSuccess, onOverlap, initialData, isEdit 
}: AddEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string, name: string }[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    customBdName: '',
    category: '',
    hours: '',
    notes: '',
    start_date: '',
    end_date: '',
  });

  const selectOptions = [
    { value: '', label: 'Select Client...' },
    ...clients.map(c => ({ value: c.id, label: c.name }))
  ];

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      if (isEdit && initialData) {
        setFormData({
          client_id: initialData.client_id || '',
          customBdName: '',
          category: initialData.category || '',
          hours: initialData.hours?.toString() || '',
          notes: initialData.notes || '',
          start_date: initialData.start_date || '',
          end_date: initialData.end_date || '',
        });
      } else {
        setFormData({
          client_id: '',
          customBdName: '',
          category: '',
          hours: '',
          notes: '',
          start_date: '',
          end_date: '',
        });
      }
    }
  }, [isOpen, isEdit, initialData]);

  const fetchClients = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients`);
      const data = await response.json();
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    setLoading(true);

    // Validate both populated
    if (formData.client_id && formData.customBdName.trim()) {
      alert("🚨 Error: You have selected a client from the dropdown AND entered a custom BD client name. Please use only one of these options.");
      setLoading(false);
      return;
    }

    // Validate neither populated
    if (!formData.client_id && !formData.customBdName.trim()) {
      alert("🚨 Error: Please select a client or enter a custom BD name.");
      setLoading(false);
      return;
    }

    let currentClientId = formData.client_id;

    if (formData.customBdName.trim()) {
      try {
        const bdName = `BD - ${formData.customBdName.trim()}`;
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
        currentClientId = newClient.id;
      } catch (err: any) {
        alert(`Failed to add client: ${err.message}`);
        setLoading(false);
        return;
      }
    }

    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit 
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/allocations/${initialData.id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/allocations/${type}`;
    
    try {
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify({
          user_id: userId,
          month,
          kind: type,
          client_id: currentClientId,
          category: formData.category,
          hours: parseFloat(formData.hours),
          notes: formData.notes,
          start_date: formData.start_date,
          end_date: formData.end_date,
          force
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 409) {
          try {
            const result = JSON.parse(errorText);
            onOverlap(result.existing, result.error.includes('Blocking'), {
              client_id: currentClientId,
              category: formData.category,
              hours: formData.hours,
              notes: formData.notes,
              start_date: formData.start_date,
              end_date: formData.end_date
            });
            setLoading(false);
            return;
          } catch (e) {
             throw new Error("Conflict error, but failed to parse details");
          }
        }
        
        try {
          const result = JSON.parse(errorText);
          throw new Error(result.error || 'Failed to save');
        } catch {
          throw new Error(`Server Error: ${response.status} during allocation saving`);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Save Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Edit' : 'Add'} {type === 'weekly' ? 'Weekly Actual' : 'Monthly Projection'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Client (Dropdown)</label>
                <SearchableSelect 
                  options={selectOptions}
                  value={formData.client_id}
                  onChange={(val) => setFormData({ ...formData, client_id: val })}
                  placeholder="Select Client"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Or Add as BD (Manual)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">BD -</span>
                  <input 
                    type="text" 
                    value={formData.customBdName} 
                    onChange={(e) => setFormData({ ...formData, customBdName: e.target.value })} 
                    placeholder="Client Name" 
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 h-[42px]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Category</label>
              <input 
                type="text" 
                required
                placeholder="Meeting / Internal / Billable"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-[42px]"
              />
            </div>
          </div>

          {type === 'weekly' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Start Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">End Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Hours</label>
            <input 
              type="number" 
              step="0.25"
              required
              placeholder="0.00"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Notes</label>
            <textarea 
              rows={3}
              placeholder="What did you work on?"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
            ></textarea>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              disabled={loading}
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
