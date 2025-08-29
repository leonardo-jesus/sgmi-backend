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

// Production Entry routes (accessible to all authenticated users)
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

// Batch routes (accessible to operators, managers, and directors)
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
  '/batches/:batchId/actions',
  authorize(['OPERATOR', 'MANAGER', 'DIRECTOR']),
  validateParams(UuidParamSchema.extend({ batchId: UuidParamSchema.shape.id })),
  validateBody(BatchActionSchema),
  batchController.performAction
);

router.get(
  '/batches/:batchId/status',
  validateParams(UuidParamSchema.extend({ batchId: UuidParamSchema.shape.id })),
  batchController.getBatchStatus
);

export { router as productionRouter };
