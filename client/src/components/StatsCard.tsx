interface StatsCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: any;
  color: string;
}

export default function StatsCard({ label, value, subtext, icon: Icon, color }: StatsCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          {subtext && <span className="text-xs text-slate-400">{subtext}</span>}
        </div>
      </div>
    </div>
  );
}
