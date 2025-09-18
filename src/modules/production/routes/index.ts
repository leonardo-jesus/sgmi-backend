import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import { BatchController } from '../controllers/BatchController.js';
import { ProductionEntryController } from '../controllers/ProductionEntryController.js';

const router = Router();
const entryController = new ProductionEntryController();
const batchController = new BatchController();

// All production routes require authentication
router.use(authenticate);

// NEW SIMPLIFIED BATCH CREATION ROUTE
router.post(
  '/batches/simple',
  authorize(['OPERATOR', 'MANAGER', 'DIRECTOR']),
  batchController.createSimpleBatch
);

// GET PRODUCTION SESSIONS (for SGMI second tab reporting)
router.get(
  '/sessions',
  authorize(['DIRECTOR', 'MANAGER']),
  entryController.getProductionSessions
);

export { router as productionRouter };
