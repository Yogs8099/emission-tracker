import { Router } from 'express';
import {
  createEmission,
  getEmissions,
  updateEmission,
  deleteEmission,
  updateEmissionStatus,
  getEmissionTotals
} from '../controllers/emission.controller';

import { mockAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(mockAuthMiddleware);

router.post('/', createEmission);
router.get('/', getEmissions);

router.get('/totals', getEmissionTotals);

router.patch('/:id', updateEmission);
router.delete('/:id', deleteEmission);
router.patch('/:id/status', updateEmissionStatus);


export default router;