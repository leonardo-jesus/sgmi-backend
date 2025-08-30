import type { Response } from 'express';
import { AuthenticatedRequest } from '../../../shared/middleware/auth.js';
import { asyncHandler } from '../../../shared/middleware/errorHandler.js';
import { ReportService } from '../services/ReportService.js';

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  getProductionReport = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { from, to, product_id } = req.query as any;

      const filters: any = {};
      if (from) filters.from = new Date(from);
      if (to) filters.to = new Date(to);
      if (product_id) filters.product_id = product_id;

      const report = await this.reportService.getProductionReport(filters);

      res.json({
        success: true,
        data: report,
        meta: {
          count: report.length,
          total_batches: report.reduce(
            (sum, item) => sum + item.batches_count,
            0
          ),
          total_production_hours:
            Math.round(
              report.reduce(
                (sum, item) => sum + item.total_production_hours,
                0
              ) * 100
            ) / 100,
          total_estimated_kg:
            Math.round(
              report.reduce((sum, item) => sum + item.estimated_kg, 0) * 100
            ) / 100,
        },
      });
    }
  );

  getProductionSummary = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { from, to } = req.query as any;

      const filters: any = {};
      if (from) filters.from = new Date(from);
      if (to) filters.to = new Date(to);

      const summary = await this.reportService.getProductionSummary(filters);

      res.json({
        success: true,
        data: summary,
      });
    }
  );

  getDailyTrend = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { from, to, product_id } = req.query as any;

      const filters: any = {};
      if (from) filters.from = new Date(from);
      if (to) filters.to = new Date(to);
      if (product_id) filters.product_id = product_id;

      const trend = await this.reportService.getDailyProductionTrend(filters);

      res.json({
        success: true,
        data: trend,
        meta: {
          count: trend.length,
          date_range: {
            from: trend[0]?.date || null,
            to: trend[trend.length - 1]?.date || null,
          },
        },
      });
    }
  );

  getShiftPerformance = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { from, to } = req.query as any;

      const filters: any = {};
      if (from) filters.from = new Date(from);
      if (to) filters.to = new Date(to);

      const performance = await this.reportService.getShiftPerformance(filters);

      // Sort by standard shift order
      const shiftOrder = { MORNING: 1, AFTERNOON: 2, NIGHT: 3 };
      performance.sort((a, b) => shiftOrder[a.shift] - shiftOrder[b.shift]);

      res.json({
        success: true,
        data: performance,
        meta: {
          total_shifts: performance.length,
        },
      });
    }
  );
}
