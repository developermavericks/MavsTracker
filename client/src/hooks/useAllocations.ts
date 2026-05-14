import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useAllocations(userId: string | undefined, month: string, type: 'projected' | 'weekly') {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocations = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const table = type === 'projected' ? 'allocations_monthly' : 'allocations_weekly';
    
    try {
      const { data: allocations, error: supabaseError } = await supabase
        .from(table)
        .select('*, clients(name)')
        .eq('user_id', userId)
        .eq('month', month);

      if (supabaseError) throw supabaseError;
      setData(allocations || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, [userId, month, type]);

  return { data, loading, error, refresh: fetchAllocations };
}
