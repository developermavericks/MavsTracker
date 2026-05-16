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

    // Check database for existing user and role
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      // For NEW users, default to 'team'
      await supabase.from('users').insert([{
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        picture: user.user_metadata?.avatar_url,
        role: 'team' // New users start as team
      }]);
      (req as any).user_role = 'team';
    } else {
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
