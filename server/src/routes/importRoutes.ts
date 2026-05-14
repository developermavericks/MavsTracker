import { Router } from 'express';
import multer from 'multer';
import { importExcel } from '../controllers/importController';
import { authenticate } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/excel', authenticate, upload.single('file'), importExcel);

export default router;
