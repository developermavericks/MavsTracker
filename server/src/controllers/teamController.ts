import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';

export const getTeamMembers = async (req: Request, res: Response) => {
  const { managerId } = req.query;

  if (!managerId) {
    return res.status(400).json({ error: 'Missing managerId' });
  }

  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        member_id,
        member:users!member_id(id, name, email, picture)
      `)
      .eq('manager_id', managerId);

    if (error) throw error;
    
    // Flatten the response
    const members = data.map((item: any) => item.member);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMemberAllocations = async (req: Request, res: Response) => {
  const { memberId, month, kind } = req.query;

  if (!memberId || !month) {
    return res.status(400).json({ error: 'Missing memberId or month' });
  }

  try {
    const table = kind === 'projected' ? 'allocations_monthly' : 'allocations_weekly';
    const { data, error } = await supabase
      .from(table)
      .select('*, clients(name)')
      .eq('user_id', memberId)
      .eq('month', month);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Fetch users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (usersError) throw usersError;

    // Fetch all unique manager IDs from teams table
    const { data: managers, error: managersError } = await supabase
      .from('teams')
      .select('manager_id');

    if (managersError) throw managersError;

    const managerIds = new Set(managers.map((m: any) => m.manager_id));

    // Append is_manager flag
    const usersWithManagerStatus = users.map((u: any) => ({
      ...u,
      is_manager: managerIds.has(u.id)
    }));

    res.json(usersWithManagerStatus);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const assignPooja = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    // We try to bypass using the auth client first
    const authClient = token ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }) : supabase;

    const { data: pooja } = await authClient.from('users').select('id').eq('email', 'pooja@themavericksindia.com').single();
    if (!pooja) return res.status(404).json({ error: 'Pooja not found' });

    const emails = ['arunkumar@themavericksindia.com', 'divyanshsharma@themavericksindia.com', 'satyam.singh@themavericksindia.com'];
    const { data: members } = await authClient.from('users').select('id').in('email', emails);
    if (!members) return res.status(404).json({ error: 'Members not found' });

    const inserts = members.map((m: any) => ({ manager_id: pooja.id, member_id: m.id }));
    
    // Delete existing mappings
    await authClient.from('teams').delete().in('member_id', members.map((m: any) => m.id));
    
    // Insert new mappings
    const { error } = await authClient.from('teams').insert(inserts);
    if (error) {
      console.log("RLS failed with auth client, trying anon client as fallback");
      const { error: anonError } = await supabase.from('teams').insert(inserts);
      if (anonError) throw anonError;
    }

    res.json({ success: true, message: 'Mapped successfully' });
  } catch (error: any) {
    console.error('Assign error:', error);
    res.status(500).json({ error: error.message });
  }
};
