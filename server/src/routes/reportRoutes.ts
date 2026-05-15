import { Router } from 'express';
import { getMasterReport, exportReport } from '../controllers/reportController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(['core']));

router.get('/master', getMasterReport);
router.get('/export', exportReport);
router.get('/clients-summary', require('../controllers/reportController').getClientSummary);
router.get('/client-roster', require('../controllers/reportController').getClientRoster);

export default router;
