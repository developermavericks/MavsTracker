'use client';

import { useState, useEffect } from 'react';
import { Search, User, Clock, Briefcase, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const MASTER_EMAILS = [
  "aashna@themavericksindia.com", "abhilasha@themavericksindia.com", "aditya.s@themavericksindia.com",
  "akshay@themavericksindia.com", "alisha@themavericksindia.com", "anil@themavericksindia.com",
  "anoushka.aristotle@themavericksindia.com", "apurva@themavericksindia.com", "archana@themavericksindia.com",
  "ariba@themavericksindia.com", "arunkumar@themavericksindia.com", "avarna@themavericksindia.com",
  "avinash@themavericksindia.com", "bhavya@themavericksindia.com", "brinda@themavericksindia.com",
  "chetan@themavericksindia.com", "chhavi.a@themavericksindia.com", "disha.kalra@themavericksindia.com",
  "divyanshsharma@themavericksindia.com", "drishtiic@themavericksindia.com", "gaurav@themavericksindia.com",
  "grishma@themavericksindia.com", "harprateek@themavericksindia.com", "harshita@themavericksindia.com",
  "hooper@themavericksindia.com", "ila@themavericksindia.com", "ishmeet@themavericksindia.com",
  "jolly@themavericksindia.com", "joyeta.debnath@themavericksindia.com", "jyoshitha@themavericksindia.com",
  "kashish@themavericksindia.com", "kavita@themavericksindia.com", "khushi@themavericksindia.com",
  "kyle@themavericksindia.com", "laveena@themavericksindia.com", "mahek@themavericksindia.com",
  "mahek.chacha@themavericksindia.com", "manaswi@themavericksindia.com", "mansi@themavericksindia.com",
  "manvi@themavericksindia.com", "mitalip@themavericksindia.com", "mohamed.hisham@themavericksindia.com",
  "muskaan@themavericksindia.com", "muskaan.bhardwaj@themavericksindia.com", "muskaan.harjai@themavericksindia.com",
  "neha@themavericksindia.com", "pavithra@themavericksindia.com", "pooja@themavericksindia.com",
  "pratyasha@themavericksindia.com", "priyadarshini@themavericksindia.com", "rajvi@themavericksindia.com",
  "ridhi@themavericksindia.com", "rishika@themavericksindia.com", "ritik@themavericksindia.com",
  "ritika@themavericksindia.com", "riya.rupani@themavericksindia.com", "samrat@themavericksindia.com",
  "sanya.p@themavericksindia.com", "satyam.singh@themavericksindia.com", "shinjini@themavericksindia.com",
  "shreshtha.chaturvedi@themavericksindia.com", "smita@themavericksindia.com", "smriti@themavericksindia.com",
  "snigdha@themavericksindia.com", "srishtee@themavericksindia.com", "srishti.chanda@themavericksindia.com",
  "surya@themavericksindia.com", "sushant@themavericksindia.com", "tech@themavericksindia.com",
  "tonmoyee@themavericksindia.com", "triyanshi@themavericksindia.com", "udita@themavericksindia.com",
  "vanshika@themavericksindia.com", "varun@themavericksindia.com", "vibhu@themavericksindia.com",
  "vibhuti@themavericksindia.com", "vishakha@themavericksindia.com"
];

export default function MemberInsights({ month: initialMonth }: { month: string }) {
  const [internalMonth, setInternalMonth] = useState(initialMonth);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [memberData, setMemberData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  // Parse internalMonth into year and month index
  const currentYear = internalMonth.split('-')[0];
  const currentMonth = internalMonth.split('-')[1];

  const handleMonthChange = (newMonth: string) => {
    setInternalMonth(`${currentYear}-${newMonth}`);
  };

  const handleYearChange = (newYear: string) => {
    setInternalMonth(`${newYear}-${currentMonth}`);
  };

  const fetchMemberReport = async () => {
    if (!selectedEmail) return;
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/member?email=${selectedEmail}&month=${internalMonth}`);
      const data = await response.json();
      setMemberData(data.allocations || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Failed to fetch member report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Logic for Zero Hour Members
  const [zeroHourMembers, setZeroHourMembers] = useState<string[]>([]);
  
  useEffect(() => {
    fetchZeroHourMembers();
  }, [internalMonth]);

  const fetchZeroHourMembers = async () => {
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/zero-hours?month=${internalMonth}`);
      const activeEmails = await res.json();
      const zeroList = MASTER_EMAILS.filter(email => !activeEmails.includes(email));
      setZeroHourMembers(zeroList);
    } catch (err) {
      console.error('Failed to fetch zero hour members:', err);
    }
  };

  const totalHours = memberData.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Controls */}
      <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl shadow-slate-900/20 border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Select Member</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
              <select 
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white font-bold outline-none focus:ring-4 focus:ring-orange-500/20 transition-all cursor-pointer appearance-none"
              >
                <option value="" className="text-slate-900">Choose a member...</option>
                {MASTER_EMAILS.sort().map(email => (
                  <option key={email} value={email} className="text-slate-900">{email}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Reporting Period</label>
             <div className="flex gap-2">
                <select 
                  value={currentMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white font-bold outline-none focus:ring-4 focus:ring-orange-500/20 transition-all cursor-pointer appearance-none"
                >
                  {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(m => (
                    <option key={m} value={m} className="text-slate-900">
                      {new Date(`2024-${m}-02`).toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select 
                  value={currentYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white font-bold outline-none focus:ring-4 focus:ring-orange-500/20 transition-all cursor-pointer appearance-none"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y.toString()} className="text-slate-900">{y}</option>
                  ))}
                </select>
             </div>
          </div>

          <div>
            <button 
              onClick={fetchMemberReport}
              disabled={!selectedEmail || loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-900/40 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              LOAD REPORT
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Work Log Summary
              </h3>
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black">
                  Total: {totalHours.toFixed(1)}h
                </div>
              </div>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
                  <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">Gathering insights...</p>
                </div>
              ) : memberData.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <p className="text-slate-400 font-bold italic">No work logged for this member in {month}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Hours</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source/Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memberData.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">
                                {item.clients?.name?.[0] || 'C'}
                              </div>
                              <span className="text-sm font-bold text-slate-900">{item.clients?.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className="text-sm font-black text-slate-900">{Number(item.hours).toFixed(1)}h</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{item.source || 'Manual'}</span>
                              <p className="text-xs text-slate-500 italic max-w-xs truncate">{item.notes || 'No notes'}</p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zero Hour Members Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
            <div className="px-8 py-6 bg-red-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Zero Hour Members</h3>
              </div>
              <span className="px-3 py-1 bg-white/20 rounded-lg text-white text-[10px] font-bold">
                {zeroHourMembers.length}
              </span>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {zeroHourMembers.map(email => (
                  <button 
                    key={email}
                    onClick={() => {
                      setSelectedEmail(email);
                      // Auto-load report for them? 
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-3 group"
                  >
                    <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-red-400 transition-colors" />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 truncate">{email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
