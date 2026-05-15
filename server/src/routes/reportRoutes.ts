import { Router } from 'express';
import { getMasterReport, exportReport, getMemberReport, getActiveEmails, getClientSummary, getClientRoster } from '../controllers/reportController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(['core']));

router.get('/master', getMasterReport);
router.get('/export', exportReport);
router.get('/clients-summary', getClientSummary);
router.get('/client-roster', getClientRoster);
router.get('/member', getMemberReport);
router.get('/zero-hours', getActiveEmails);

export default router;
