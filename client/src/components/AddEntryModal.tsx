'use client';

import { useState } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';

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
    category: '',
    hours: '',
    notes: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      if (isEdit && initialData) {
        setFormData({
          client_id: initialData.client_id || '',
          category: initialData.category || '',
          hours: initialData.hours?.toString() || '',
          notes: initialData.notes || '',
          start_date: initialData.start_date || '',
          end_date: initialData.end_date || '',
        });
      } else {
        setFormData({
          client_id: '',
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

    let currentClientId = formData.client_id;


    if (!currentClientId) {
      alert("Please select or enter a client name");
      setLoading(false);
      return;
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
          ...formData,
          client_id: currentClientId,
          hours: parseFloat(formData.hours),
          force
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 409) {
          try {
            const result = JSON.parse(errorText);
            onOverlap(result.existing, result.error.includes('Blocking'), { ...formData, client_id: currentClientId });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? 'Edit' : 'Add'} {type === 'weekly' ? 'Weekly Actual' : 'Monthly Projection'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Client</label>
              <select 
                value={formData.client_id}
                onChange={(e) => {
                  setFormData({ ...formData, client_id: e.target.value });
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select Client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Category</label>
              <input 
                type="text" 
                required
                placeholder="Meeting / Internal / Billable"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">End Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Notes</label>
            <textarea 
              rows={3}
              placeholder="What did you work on?"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
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
