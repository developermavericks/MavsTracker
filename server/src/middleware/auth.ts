import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, Next: NextFunction) => {
  let token = '';
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Domain Restriction Check
    const email = user.email || '';
    console.log(`[AUTH] Authenticating user: ${email}`);
    if (!email.endsWith('@themavericksindia.com')) {
      console.warn(`[AUTH] Rejected email domain: ${email}`);
      return res.status(403).json({ error: 'Access denied: Unauthorized domain' });
    }

    // 1. First, check if a user exists with this ID
    const { data: userById } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    let existingUser = userById;

    // 2. If not found by ID, check by EMAIL (this handles placeholders)
    if (!existingUser) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userByEmail) {
        console.log(`[AUTH] Linking placeholder account for ${email}`);
        const oldId = userByEmail.id;
        const newId = user.id;

        // Update referencing tables to the new ID
        await supabase.from('teams').update({ manager_id: newId }).eq('manager_id', oldId);
        await supabase.from('teams').update({ member_id: newId }).eq('member_id', oldId);
        await supabase.from('allocations_monthly').update({ user_id: newId }).eq('user_id', oldId);
        await supabase.from('allocations_weekly').update({ user_id: newId }).eq('user_id', oldId);

        // Finally update the user record itself with the new ID and metadata
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            id: newId,
            name: user.user_metadata?.full_name || userByEmail.name || email.split('@')[0],
            picture: user.user_metadata?.avatar_url || userByEmail.picture,
            last_login: new Date().toISOString()
          })
          .eq('id', oldId)
          .select()
          .single();
        
        if (updateError) console.error('[AUTH] Linking error:', updateError);
        existingUser = updatedUser;
      }
    }

    if (!existingUser) {
      // For completely NEW users not in our list
      await supabase.from('users').insert([{
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        picture: user.user_metadata?.avatar_url,
        role: 'team',
        last_login: new Date().toISOString()
      }]);
      (req as any).user_role = 'team';
    } else {
      // For EXISTING users already linked
      await supabase.from('users').update({
        name: user.user_metadata?.full_name || existingUser.name || user.email?.split('@')[0],
        picture: user.user_metadata?.avatar_url || existingUser.picture,
        last_login: new Date().toISOString()
      }).eq('id', user.id);
      
      (req as any).user_role = existingUser.role;
    }
    req.user = user;
    Next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !userData) {
        return res.status(403).json({ error: 'User role not found' });
      }

      // 'core' role has access to everything
      if (userData.role === 'core' || allowedRoles.includes(userData.role)) {
        next();
      } else {
        return res.status(403).json({ error: 'Access denied: insufficient permissions' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
