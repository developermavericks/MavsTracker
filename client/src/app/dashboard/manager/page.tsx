'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, User, ArrowLeft, Search, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import AllocationsTable from '@/components/AllocationsTable';

export default function ManagerPortal() {
  const [activeTab, setActiveTab] = useState<'self' | 'members'>('self');
  const [month, setMonth] = useState('2024-05');
  const [members, setMembers] = useState<any[]>([]);
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
      setMemberAllocations(data);
    } catch (err) {
      console.error('Failed to fetch member allocations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMember) {
      fetchMemberAllocations(selectedMember.id);
    }
  }, [selectedMember, month]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Manager Portal</h1>
          <p className="text-slate-500 mt-1">Oversee team performance and manage your own time.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            <option value="2024-05">May 2024</option>
            <option value="2024-04">April 2024</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-2 flex items-center bg-slate-50/50">
          <button 
            onClick={() => setActiveTab('self')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'self' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            My Allocations
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'members' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Team Members
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'self' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatsCard label="My Total Hours" value="142.0" icon={LayoutDashboard} color="bg-indigo-600" />
                <StatsCard label="Team Capacity" value="85%" icon={Users} color="bg-blue-600" />
              </div>
              <AllocationsTable data={[]} type="weekly" />
            </div>
          ) : (
            <div className="space-y-6">
              {selectedMember ? (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <button 
                    onClick={() => setSelectedMember(null)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Member List
                  </button>
                  <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    {selectedMember.picture ? (
                      <img src={selectedMember.picture} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xl font-bold">
                        {selectedMember.name?.[0] || 'U'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{selectedMember.name || 'Unknown'}</h3>
                      <p className="text-sm text-slate-500">{selectedMember.email}</p>
                    </div>
                  </div>
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : (
                    <AllocationsTable data={memberAllocations} type="weekly" />
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search team members..."
                      className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.length === 0 ? (
                      <p className="col-span-full text-center text-slate-400 py-10 italic">No team members assigned.</p>
                    ) : (
                      members.map(member => (
                        <button 
                          key={member.id}
                          onClick={() => setSelectedMember(member)}
                          className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-50 transition-all text-left group"
                        >
                          <div className="flex items-center gap-4">
                            {member.picture ? (
                              <img src={member.picture} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                {member.name?.[0] || 'U'}
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-slate-900">{member.name || 'Unknown'}</h4>
                              <p className="text-xs text-slate-500">{member.email}</p>
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
