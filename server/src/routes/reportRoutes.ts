import { Router } from 'express';
import { getMasterReport, exportReport } from '../controllers/reportController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireRole(['core']));

router.get('/master', getMasterReport);
router.get('/export', exportReport);

export default router;
