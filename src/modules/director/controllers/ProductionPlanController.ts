import type { Response } from 'express';
import { AuthenticatedRequest } from '../../../shared/middleware/auth.js';
import { asyncHandler } from '../../../shared/middleware/errorHandler.js';
import { ProductionPlanService } from '../services/ProductionPlanService.js';

export class ProductionPlanController {
  private planService: ProductionPlanService;

  constructor() {
    this.planService = new ProductionPlanService();
  }

  createPlan = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { product_id, planned_quantity, planned_date } = req.body;

      const planId = await this.planService.createProductionPlan({
        product_id,
        planned_quantity,
        planned_date: new Date(planned_date),
      });

      res.status(201).json({
        success: true,
        data: { id: planId },
        message: 'Production plan created successfully',
      });
    }
  );

  getPlans = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { from, to, status, product_id } = req.query as any;

    const filters: any = {};
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);
    if (status) filters.status = status;

    const plans = await this.planService.getProductionPlans(filters);

    // Filter by product_id if specified (not supported by service method directly)
    const filteredPlans = product_id
      ? plans.filter((plan) => plan.productId === product_id)
      : plans;

    res.json({
      success: true,
      data: filteredPlans,
      meta: {
        count: filteredPlans.length,
      },
    });
  });

  updatePlanStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const { status } = req.body;

      await this.planService.updateProductionPlanStatus(id, status);

      res.json({
        success: true,
        message: 'Production plan status updated successfully',
      });
    }
  );

  getTotalProduction = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { from, to, product_id } = req.query as any;

      const filters: any = {};
      if (from) filters.from = new Date(from);
      if (to) filters.to = new Date(to);
      if (product_id) filters.product_id = product_id;

      const totals = await this.planService.getTotalProduction(filters);

      res.json({
        success: true,
        data: totals,
        meta: {
          count: totals.length,
          total_planned: totals.reduce(
            (sum, item) => sum + item.total_planned,
            0
          ),
          total_produced: totals.reduce(
            (sum, item) => sum + item.total_produced,
            0
          ),
        },
      });
    }
  );
}
