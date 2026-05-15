'use client';

import { useState, useEffect } from 'react';
import { Target, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ClientTargetsCard({ month, actuals, title }: { month: string, actuals: any[], title?: string }) {
  const [projections, setProjections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjections();
  }, [month]);

  const fetchProjections = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clients/projections?month=${month}`);
      const data = await response.json();
      setProjections(data);
    } catch (err) {
      console.error('Failed to fetch projections:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
    </div>
  );

  if (projections.length === 0) return null;

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-8 py-6 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title || 'Monthly Targets'}</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Admin Estimated Goals</p>
          </div>
        </div>
      </div>
      
      <div className="p-8 space-y-6">
        {projections.map(p => {
          const percentage = Math.min(100, (p.actual_hours / p.target_hours) * 100);
          
          return (
            <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 group hover:bg-slate-100/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-lg">
                    {p.clients?.name?.[0] || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{p.clients?.name || 'Unknown Client'}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Clock className="w-3 h-3 text-orange-400" />
                      {p.actual_hours.toFixed(1)}h / {p.target_hours}h
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-slate-900">{percentage.toFixed(0)}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full transition-all duration-1000 ease-out rounded-full ${percentage >= 100 ? 'bg-emerald-500' : 'bg-orange-600'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em]">
                <span className={percentage >= 100 ? "text-emerald-600" : "text-slate-400"}>
                  {percentage >= 100 ? "Target Achieved" : `${(p.target_hours - p.actual_hours).toFixed(1)}h remaining`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
