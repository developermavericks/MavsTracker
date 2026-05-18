import { Router } from 'express';
import { getFinanceMaster, exportFinanceMaster, saveUserSalary, saveClientBudgetAndCore } from '../controllers/financeController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Master allocation routes
router.get('/master', authenticate, getFinanceMaster);
router.get('/export', authenticate, exportFinanceMaster);

// Admin overrides routes (salary & budgets)
router.post('/salary', authenticate, saveUserSalary);
router.post('/client-budget', authenticate, saveClientBudgetAndCore);

export default router;
