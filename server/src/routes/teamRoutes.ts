import { Router } from 'express';
import { getTeamMembers, getMemberAllocations, getAllUsers, deleteUser, updateUserRole, updateUserExitDate } from '../controllers/teamController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/members', requireRole(['manager', 'core']), getTeamMembers);
router.get('/allocations', requireRole(['manager', 'core']), getMemberAllocations);
router.get('/all', requireRole(['core']), getAllUsers);

router.get('/me', (req, res) => {
  res.json({ role: (req as any).user_role || 'team' });
});

router.delete('/users/:id', requireRole(['core']), deleteUser);
router.patch('/users/:id/role', requireRole(['core']), updateUserRole);
router.patch('/users/:id/exit-date', requireRole(['core']), updateUserExitDate);

export default router;

