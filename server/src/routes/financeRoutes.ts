import { Router } from 'express';
import { getFinanceMaster, exportFinanceMaster, saveUserSalary, saveClientBudgetAndCore } from '../controllers/financeController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Restrict all finance portal endpoints to only core members
router.use(authenticate, requireRole(['core']));

// Master allocation routes
router.get('/master', getFinanceMaster);
router.get('/export', exportFinanceMaster);

// Admin overrides routes (salary & budgets)
router.post('/salary', saveUserSalary);
router.post('/client-budget', saveClientBudgetAndCore);

export default router;
