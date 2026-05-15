import { Router } from 'express';
import { getClients, createClient } from '../controllers/clientController';

const router = Router();

router.get('/', getClients);
router.post('/', createClient);
router.get('/projections', getClientProjections);
router.post('/projections', setClientProjection);
router.put('/projections/:id', require('../controllers/clientController').updateClientProjection);
router.delete('/projections/:id', require('../controllers/clientController').deleteClientProjection);

export default router;
