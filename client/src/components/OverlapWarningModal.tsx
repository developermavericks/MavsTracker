'use client';

import { X, AlertTriangle, AlertCircle } from 'lucide-react';

interface OverlapWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceSave: () => void;
  overlaps: any[];
  isBlocking: boolean;
}

export default function OverlapWarningModal({ isOpen, onClose, onForceSave, overlaps, isBlocking }: OverlapWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-red-100 animate-in fade-in zoom-in duration-300">
        <div className="px-8 py-6 border-b border-red-50 flex items-center justify-between bg-red-50/50">
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold">
              {isBlocking ? 'Blocking Overlap' : 'Time Period Conflict'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-relaxed">
              {isBlocking 
                ? 'An entry with the same client and notes already exists in this overlapping period. You must edit or delete the existing entry first.'
                : 'One or more entries already exist in this time period. Would you like to add this anyway?'}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Existing Entries</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {overlaps.map((overlap, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900">{overlap.clients?.name}</span>
                    <span className="font-mono text-xs text-slate-500">{overlap.hours}h</span>
                  </div>
                  <p className="text-xs text-slate-500 italic mb-1">{overlap.notes}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {overlap.start_date} – {overlap.end_date}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
            >
              {isBlocking ? 'Go Back' : 'Cancel'}
            </button>
            {!isBlocking && (
              <button 
                onClick={onForceSave}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                Add Anyway
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
