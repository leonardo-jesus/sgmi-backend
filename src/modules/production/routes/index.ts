import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../../shared/middleware/validation.js';
import {
  BatchActionSchema,
  CreateBatchSchema,
  CreateProductionEntrySchema,
  DateRangeSchema,
  ProductionEntryQuerySchema,
  UuidParamSchema,
} from '../../../shared/validation/schemas.js';
import { BatchController } from '../controllers/BatchController.js';
import { ProductionEntryController } from '../controllers/ProductionEntryController.js';

const router = Router();
const entryController = new ProductionEntryController();
const batchController = new BatchController();

// All production routes require authentication
router.use(authenticate);

// Production Entry routes - Simple production logging (legacy system)
// Used for basic production recording without batch tracking
router.post(
  '/entries',
  validateBody(CreateProductionEntrySchema),
  entryController.createEntry
);

router.get(
  '/entries',
  validateQuery(ProductionEntryQuerySchema),
  entryController.getEntries
);

router.get(
  '/entries/totals',
  validateQuery(DateRangeSchema),
  entryController.getTotals
);

// Batch routes - Real-time production tracking (operators record actual batches)
// Used in @SGMI-PADARIA where operators log batch count and duration
router.post(
  '/batches',
  authorize(['OPERATOR', 'MANAGER', 'DIRECTOR']),
  validateBody(CreateBatchSchema),
  batchController.createBatch
);

router.get(
  '/plans/:planId/batches',
  validateParams(UuidParamSchema.extend({ planId: UuidParamSchema.shape.id })),
  batchController.getBatches
);

router.post(
  '/batches/:id/actions',
  authorize(['OPERATOR', 'MANAGER', 'DIRECTOR']),
  validateParams(UuidParamSchema.extend({ id: UuidParamSchema.shape.id })),
  validateBody(BatchActionSchema),
  batchController.performAction
);

router.get(
  '/batches/:id/status',
  validateParams(UuidParamSchema.extend({ id: UuidParamSchema.shape.id })),
  batchController.getBatchStatus
);

// NEW SIMPLIFIED BATCH CREATION ROUTE
router.post(
  '/batches/simple',
  authorize(['OPERATOR', 'MANAGER', 'DIRECTOR']),
  batchController.createSimpleBatch
);

// FIND ACTIVE SESSION ROUTE
router.get(
  '/sessions/active',
  authorize(['OPERATOR', 'MANAGER', 'DIRECTOR']),
  batchController.findActiveSession
);

export { router as productionRouter };
