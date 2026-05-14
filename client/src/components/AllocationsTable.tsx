'use client';

import { Edit2, Trash2 } from 'lucide-react';

interface Allocation {
  id: string;
  month: string;
  clients: { name: string };
  category: string;
  hours: number;
  notes: string;
  start_date?: string;
  end_date?: string;
}

interface AllocationsTableProps {
  data: Allocation[];
  type: 'projected' | 'weekly';
  displayMode?: 'detailed' | 'summary';
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function AllocationsTable({ data, type, displayMode = 'detailed', onEdit, onDelete }: AllocationsTableProps) {
  // Aggregate data if in summary mode
  const displayData = displayMode === 'summary' ? 
    Object.values(data.reduce((acc: any, item) => {
      const client = item.clients?.name || 'Unknown';
      if (!acc[client]) {
        acc[client] = { ...item, id: `sum-${client}`, hours: 0, notes: 'Aggregated view', start_date: 'Various', end_date: 'Various' };
      }
      acc[client].hours += item.hours;
      return acc;
    }, {})) as Allocation[] : data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {type === 'weekly' && displayMode === 'detailed' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Period</th>}
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
            {displayMode === 'detailed' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>}
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hours</th>
            {displayMode === 'detailed' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Notes</th>}
            {displayMode === 'detailed' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {displayData.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                No entries for this period
              </td>
            </tr>
          ) : (
            displayData.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors group">
                {type === 'weekly' && displayMode === 'detailed' && (
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium whitespace-nowrap">
                    {item.start_date} – {item.end_date}
                  </td>
                )}
                <td className="px-6 py-4 text-sm text-slate-900 font-bold">{item.clients?.name || 'Unknown'}</td>
                {displayMode === 'detailed' && (
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="bg-slate-100 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
                      {item.category}
                    </span>
                  </td>
                )}
                <td className="px-6 py-4 text-sm text-slate-900 font-bold text-right font-mono">{item.hours.toFixed(2)}</td>
                {displayMode === 'detailed' && <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{item.notes}</td>}
                {displayMode === 'detailed' && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit?.(item.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete?.(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
