import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getClients = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createClient = async (req: Request, res: Response) => {
  const name = req.body.name?.trim();

  if (!name) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([{ name }])
      .select();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        // Fetch the existing client to return it
        const { data: existing } = await supabase
          .from('clients')
          .select('*')
          .eq('name', name)
          .single();
        
        if (existing) {
          return res.status(200).json(existing); // Return existing instead of error
        }
      }
      throw error;
    }
    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const setClientProjection = async (req: Request, res: Response) => {
  const { client_id, month, target_hours } = req.body;

  if (!client_id || !month || target_hours === undefined) {
    return res.status(400).json({ error: 'Missing client_id, month, or target_hours' });
  }

  try {
    const { data, error } = await supabase
      .from('client_projections')
      .upsert([{ client_id, month, target_hours }], { onConflict: 'client_id,month' })
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getClientProjections = async (req: Request, res: Response) => {
  const { month } = req.query;
  try {
    // 1. Get projections
    let query = supabase
      .from('client_projections')
      .select('*, clients(name)');
    
    if (month) {
      query = query.eq('month', month);
    }

    const { data: projections, error } = await query.order('month', { ascending: false });

    if (error) throw error;

    // 2. Get actual hours summarized by client and month
    const { data: actuals, error: actualsError } = await supabase
      .from('weekly_allocations')
      .select('client_id, month, hours');

    if (actualsError) throw actualsError;

    // 3. Merge them
    const merged = projections.map(p => {
      const actualHours = (actuals || [])
        .filter(a => a.client_id === p.client_id && a.month === p.month)
        .reduce((sum, curr) => sum + (Number(curr.hours) || 0), 0);
      
      return {
        ...p,
        actual_hours: actualHours
      };
    });

    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteClientProjection = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('client_projections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateClientProjection = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { target_hours } = req.body;

  try {
    const { data, error } = await supabase
      .from('client_projections')
      .update({ target_hours })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
