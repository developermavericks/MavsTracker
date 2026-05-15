import { Router } from 'express';
import { getMasterReport, exportReport, getMemberReport, getActiveEmails, getClientSummary, getClientRoster } from '../controllers/reportController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Public-ish reports for managers and core
router.get('/member', requireRole(['manager', 'core']), getMemberReport);
router.get('/zero-hours', requireRole(['manager', 'core']), getActiveEmails);

// High-level reports restricted to core
router.use(requireRole(['core']));
router.get('/master', getMasterReport);
router.get('/export', exportReport);
router.get('/clients-summary', getClientSummary);
router.get('/client-roster', getClientRoster);

export default router;
