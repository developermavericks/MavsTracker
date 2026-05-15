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
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberAllocations, setMemberAllocations] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchMembers(data.user.id);
    });
  }, []);

  useEffect(() => {
    fetchActiveEmails();
  }, [month]);

  const fetchActiveEmails = async () => {
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/zero-hours?month=${month}`);
      const data = await response.json();
      setActiveEmails(data.map((e: string) => e.toLowerCase()));
    } catch (err) {
      console.error('Failed to fetch active emails:', err);
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
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <select 
            value={month.split('-')[1]} 
            onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
            className="px-4 py-2 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
          >
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
              <option key={m} value={m}>{new Date(2024, parseInt(m)-1).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <div className="w-[1px] bg-slate-100 my-2" />
          <select 
            value={month.split('-')[0]} 
            onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
            className="px-4 py-2 text-sm font-bold bg-transparent border-none focus:ring-0 outline-none cursor-pointer text-indigo-600"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
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
                <div className="space-y-6">
                  <div className="relative group">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search team members..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.length === 0 ? (
                      <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <Users className="w-12 h-12 text-slate-300 mx-auto" />
                        <div>
                          <p className="text-slate-900 font-bold">No Team Members Found</p>
                          <p className="text-slate-500 text-sm">Members you manage will appear here once mapped.</p>
                        </div>
                      </div>
                    ) : (
                      members.map(member => (
                        <button 
                          key={member.id}
                          onClick={() => setSelectedMember(member)}
                          className="p-6 bg-white border border-slate-200 rounded-3xl hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100 transition-all text-left group relative overflow-hidden"
                        >
                          <div className="flex items-center gap-4">
                            {member.picture ? (
                              <img src={member.picture} className="w-14 h-14 rounded-2xl object-cover ring-4 ring-slate-50" />
                            ) : (
                              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                {member.name?.[0] || 'U'}
                              </div>
                            )}
                            <div>
                              <h4 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{member.name || 'Unknown'}</h4>
                              <p className="text-xs text-slate-500 font-medium">{member.email}</p>
                            </div>
                          </div>
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-indigo-600 text-white p-1 rounded-lg">
                              <ArrowLeft className="w-3 h-3 rotate-180" />
                            </div>
                          </div>
                        </button>
                      ))
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
