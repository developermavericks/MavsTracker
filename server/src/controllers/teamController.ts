import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { isActiveUser } from '../config/activeUsers';

export const getTeamMembers = async (req: Request, res: Response) => {
  const { managerId } = req.query;

  if (!managerId) {
    return res.status(400).json({ error: 'Missing managerId' });
  }

  try {
    // 1. Fetch this manager's members
    const { data: memberRows, error: memberError } = await supabase
      .from('teams')
      .select(`
        member_id,
        member:users!member_id(id, name, email, picture)
      `)
      .eq('manager_id', managerId);

    if (memberError) throw memberError;

    // 2. Fetch who manages this manager to prevent parent managers from showing as members
    const { data: managerRows, error: managerError } = await supabase
      .from('teams')
      .select('manager_id')
      .eq('member_id', managerId);

    const parentManagerIds = new Set(
      managerError || !managerRows ? [] : managerRows.map((r: any) => r.manager_id)
    );
    
    // 3. Flatten and exclude parent managers
    const members = memberRows
      .map((item: any) => item.member)
      .filter((m: any) => m && !parentManagerIds.has(m.id));

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
    const usersWithManagerStatus = users
      .map((u: any) => ({
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

export const updateUserExitDate = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { exitDate } = req.body; // Expecting 'YYYY-MM-DD' or null
  try {
    const { error } = await supabase
      .from('users')
      .update({ exit_date: exitDate || null })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

