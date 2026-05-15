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

    // Role Mapping Logic based on Provided List
    const coreEmails = [
      'pooja@themavericksindia.com',
      'chetan@themavericksindia.com',
      'tech@themavericksindia.com',
      'mitali.p@themavericksindia.com',
      'archana@themavericksindia.com',
      'smriti@themavericksindia.com',
      'gaurav@themavericksindia.com',
      'avinash@themavericksindia.com',
      'satyam.singh@themavericksindia.com',
      'arunkumar@themavericksindia.com',
      'divyanshsharma@themavericksindia.com',
      'developerteam@themavericksindia.com'
    ];

    const managerEmails = [
      'aashna@themavericksindia.com',
      'mahek@themavericksindia.com',
      'srishtee@themavericksindia.com',
      'vibhuti@themavericksindia.com',
      'akshay@themavericksindia.com',
      'manaswi@themavericksindia.com',
      'muskaan@themavericksindia.com',
      'indrajit@themavericksindia.com',
      'pavithra@themavericksindia.com',
      'shrestha@themavericksindia.com',
      'ila@themavericksindia.com',
      'samrat@themavericksindia.com',
      'anil@themavericksindia.com',
      'viviqa@themavericksindia.com',
      'ananya@themavericksindia.com',
      'kavita@themavericksindia.com'
    ];

    let assignedRole = 'team';
    if (coreEmails.includes(email.toLowerCase())) assignedRole = 'core';
    else if (managerEmails.includes(email.toLowerCase())) assignedRole = 'manager';

    console.log(`[AUTH] Assigned role for ${email}: ${assignedRole}`);

    // Auto-sync user to our 'users' table if missing OR role needs update
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      await supabase.from('users').insert([{
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        picture: user.user_metadata?.avatar_url,
        role: assignedRole
      }]);
    } else if (existingUser.role !== assignedRole) {
      // Update role if it changed in the list
      await supabase.from('users')
        .update({ role: assignedRole })
        .eq('id', user.id);
    }

    (req as any).user_role = assignedRole;
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

      if (!allowedRoles.includes(userData.role)) {
        return res.status(403).json({ error: 'Access denied: insufficient permissions' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
