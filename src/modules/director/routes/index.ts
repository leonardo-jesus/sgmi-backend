import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import {
  validateBody,
  validateQuery,
} from '../../../shared/middleware/validation.js';
import {
  CreateProductionPlanSchema,
  ProductionPlanQuerySchema,
  ProductionReportQuerySchema,
} from '../../../shared/validation/schemas.js';
import { ProductionPlanController } from '../controllers/ProductionPlanController.js';
import { ReportController } from '../controllers/ReportController.js';

const router = Router();
const planController = new ProductionPlanController();
const reportController = new ReportController();

// All director routes require authentication and director/manager role
router.use(authenticate);
router.use(authorize(['DIRECTOR', 'MANAGER']));

// Production Planning routes (Director creates daily production plans)
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

// Get planned production totals (what should be produced)
router.get(
  '/production-totals',
  validateQuery(ProductionReportQuerySchema),
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
  validateQuery(ProductionReportQuerySchema),
  reportController.getProductionSummary
);

router.get(
  '/reports/daily-trend',
  validateQuery(ProductionReportQuerySchema),
  reportController.getDailyTrend
);

export { router as directorRouter };
