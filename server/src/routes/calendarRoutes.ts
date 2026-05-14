import { Router } from 'express';
import { getMyEvents } from '../controllers/calendarController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Calendar requires authentication
router.get('/events', authenticate, getMyEvents);

export default router;
