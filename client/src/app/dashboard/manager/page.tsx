'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, User, ArrowLeft, Search, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import AllocationsTable from '@/components/AllocationsTable';

export default function ManagerPortal() {
  const [activeTab, setActiveTab] = useState<'self' | 'members'>('members');
  const [reportKind, setReportKind] = useState<'weekly' | 'projected'>('weekly');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [members, setMembers] = useState<any[]>([]);
  const [activeEmails, setActiveEmails] = useState<string[]>([]);
  const [activeEmailsLoading, setActiveEmailsLoading] = useState(false);
  const [activeEmailsError, setActiveEmailsError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberAllocations, setMemberAllocations] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState('team');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        try {
          const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/me`);
          const data = await res.json();
          const role = data.role || 'team';
          setUserRole(role);
          
          if (role === 'core') {
            fetchAllMembers();
          } else {
            fetchMembers(user.id);
          }
        } catch (err) {
          console.error('Failed to fetch role/members:', err);
          fetchMembers(user.id); // Fallback
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchActiveEmails();
  }, [month]);

  const fetchActiveEmails = async () => {
    setActiveEmailsLoading(true);
    setActiveEmailsError(null);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/zero-hours?month=${month}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Error ${response.status}`);
      }
      const data = await response.json();
      setActiveEmails(data.map((e: string) => e.toLowerCase()));
    } catch (err: any) {
      console.error('Failed to fetch active emails:', err);
      setActiveEmailsError(err.message);
    } finally {
      setActiveEmailsLoading(false);
    }
  };

  const fetchMembers = async (managerId: string) => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/members?managerId=${managerId}`);
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchAllMembers = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/all`);
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch all members:', err);
    }
  };

  const fetchMemberAllocations = async (memberId: string) => {
    setLoading(true);
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/allocations?memberId=${memberId}&month=${month}`);
      const data = await response.json();
      setMemberAllocations(data || []);
    } catch (err) {
      console.error('Failed to fetch member allocations:', err);
      setMemberAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMember) {
      fetchMemberAllocations(selectedMember.id);
    }
  }, [selectedMember, month]);

  const totalMemberHours = memberAllocations.reduce((acc, curr) => acc + (curr.hours || 0), 0);

  const activeMembers = members.filter(m => activeEmails.includes(m.email.toLowerCase()));
  const inactiveMembers = members.filter(m => !activeEmails.includes(m.email.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manager Portal</h1>
          <p className="text-slate-500 mt-1">Oversee team performance and manage your own time.</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm relative z-20">
          <select 
            value={month.split('-')[1]} 
            onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
            className="px-4 py-2 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-slate-900 min-w-[110px]"
          >
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
              <option key={m} value={m} className="text-slate-900">{new Date(2024, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <div className="w-[1px] bg-slate-100 my-2" />
          <select 
            value={month.split('-')[0]} 
            onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
            className="px-4 py-2 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-indigo-600 min-w-[80px]"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y} className="text-slate-900">{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-2 flex items-center bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('members')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'members' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Team Members ({activeMembers.length})
          </button>
          <button 
            onClick={() => setActiveTab('self')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'self' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            My Allocations
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'self' ? (
            <div className="space-y-6 text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <User className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">Personal View Under Development</h3>
              <p className="text-slate-500 max-w-sm mx-auto text-sm">Please use the Team Portal for logging your own time. This view will eventually show your personal summary.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {selectedMember ? (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setSelectedMember(null)}
                      className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Team
                    </button>
                      <button 
                        onClick={() => setReportKind('projected')}
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${reportKind === 'projected' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Projected
                      </button>
                    </div>
                    <div className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                      {reportKind === 'weekly' ? 'Actual' : 'Projected'} Total: {totalMemberHours.toFixed(1)}h
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-6 bg-slate-900 rounded-3xl text-white shadow-xl shadow-indigo-100">
                    {selectedMember.picture ? (
                      <img src={selectedMember.picture} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/10" />
                    ) : (
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white text-xl font-black">
                        {selectedMember.name?.[0] || 'U'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-black">{selectedMember.name || 'Unknown'}</h3>
                      <p className="text-sm text-white/60 font-medium">{selectedMember.email}</p>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Detailed Logs - {new Date(month + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h4>
                      <AllocationsTable data={memberAllocations} type="weekly" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Search and Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="relative group flex-1 max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input 
                        type="text"
                        placeholder="Search team members..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-600/5 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Active Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Active Team ({activeMembers.length})
                      </h3>
                    </div>

                    {activeMembers.length === 0 ? (
                      <div className="py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <p className="text-slate-400 text-sm font-bold italic">No active logs for this month yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeMembers.map((member) => (
                          <button 
                            key={member.id}
                            onClick={() => setSelectedMember(member)}
                            className="group bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 hover:-translate-y-1 transition-all text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-xl font-black group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                {member.name?.[0] || member.email[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{member.name || 'Unknown'}</h3>
                                <p className="text-xs text-slate-400 font-bold truncate">{member.email}</p>
                              </div>
                              <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all rotate-180" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inactive Section */}
                  <div className="space-y-6 pt-6">
                    <div className="flex items-center justify-between border-b border-red-100 pb-4">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Inactive Members (0.0H Logged)
                        {activeEmailsError && <span className="text-[10px] lowercase text-red-400 font-medium ml-2">({activeEmailsError})</span>}
                      </h3>
                      <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {inactiveMembers.length} Outstanding
                      </span>
                    </div>

                    {inactiveMembers.length === 0 ? (
                      <div className="py-12 bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center text-center">
                        <p className="text-emerald-600 text-sm font-bold uppercase tracking-widest">✓ All team members have logged time</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
                        {inactiveMembers.map((member) => (
                          <button 
                            key={member.id}
                            onClick={() => setSelectedMember(member)}
                            className="group bg-slate-50 p-6 rounded-[28px] border border-slate-200 border-dashed hover:bg-white hover:border-solid hover:border-red-200 hover:shadow-xl hover:shadow-red-900/5 hover:-translate-y-1 transition-all text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400 text-xl font-black group-hover:bg-red-500 group-hover:text-white transition-all">
                                {member.name?.[0] || member.email[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-black text-slate-600 group-hover:text-red-600 transition-colors truncate">{member.name || 'Unknown'}</h3>
                                <p className="text-xs text-slate-400 font-bold truncate">{member.email}</p>
                              </div>
                              <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-red-600 group-hover:translate-x-1 transition-all rotate-180" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
