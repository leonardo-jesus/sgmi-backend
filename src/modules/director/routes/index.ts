import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../../shared/middleware/validation.js';
import {
  CreateProductionPlanSchema,
  DateRangeSchema,
  ProductionPlanQuerySchema,
  ProductionReportQuerySchema,
  UpdateProductionPlanStatusSchema,
  UuidParamSchema,
} from '../../../shared/validation/schemas.js';
import { ProductionPlanController } from '../controllers/ProductionPlanController.js';
import { ReportController } from '../controllers/ReportController.js';

const router = Router();
const planController = new ProductionPlanController();
const reportController = new ReportController();

// All director routes require authentication and director/manager role
router.use(authenticate);
router.use(authorize(['DIRECTOR', 'MANAGER']));

// Production Plan routes
router.post(
  '/production-plans',
  validateBody(CreateProductionPlanSchema),
  planController.createPlan
);

router.get(
  '/production-plans',
  validateQuery(ProductionPlanQuerySchema),
  planController.getPlans
);

router.patch(
  '/production-plans/:id/status',
  validateParams(UuidParamSchema),
  validateBody(UpdateProductionPlanStatusSchema),
  planController.updatePlanStatus
);

router.get(
  '/production-totals',
  validateQuery(DateRangeSchema),
  planController.getTotalProduction
);

// Report routes
router.get(
  '/reports/production',
  validateQuery(ProductionReportQuerySchema),
  reportController.getProductionReport
);

router.get(
  '/reports/summary',
  validateQuery(DateRangeSchema),
  reportController.getProductionSummary
);

router.get(
  '/reports/daily-trend',
  validateQuery(ProductionReportQuerySchema),
  reportController.getDailyTrend
);

router.get(
  '/reports/shift-performance',
  validateQuery(DateRangeSchema),
  reportController.getShiftPerformance
);

export { router as directorRouter };
