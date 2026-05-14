'use client';

import { useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ExcelUploadProps {
  userId: string;
  month: string;
  type: 'projected' | 'weekly';
  onSuccess: () => void;
}

export default function ExcelUpload({ userId, month, type, onSuccess }: ExcelUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    formData.append('month', month);
    formData.append('type', type);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/import/excel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');

      setMessage({ type: 'success', text: result.message });
      setFile(null);
      onSuccess();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-8">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 rounded-2xl">
            <FileText className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Excel Bulk Import</h3>
            <p className="text-sm text-slate-500">Upload an Excel sheet to bulk-add allocations.</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center transition-all hover:border-emerald-300 hover:bg-emerald-50/20 group">
          <input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden" 
            id="excel-upload"
          />
          <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
            <div className="p-4 bg-slate-50 rounded-full mb-4 group-hover:bg-emerald-100 transition-all">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600" />
            </div>
            <p className="text-slate-600 font-bold">{file ? file.name : 'Click to select Excel file'}</p>
            <p className="text-xs text-slate-400 mt-1">Supports .xlsx and .xls formats</p>
          </label>
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded-2xl flex gap-3 items-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {file && (
          <button 
            onClick={handleUpload}
            disabled={loading}
            className="w-full mt-6 bg-emerald-600 text-white py-4 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Processing...' : 'Start Import'}
          </button>
        )}
      </div>
    </div>
  );
}
