import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../shared/middleware/auth.js';
import { asyncHandler } from '../../../shared/middleware/errorHandler.js';
import { ProductionEntryService } from '../services/ProductionEntryService.js';

export class ProductionEntryController {
  private entryService: ProductionEntryService;

  constructor() {
    this.entryService = new ProductionEntryService();
  }

  createEntry = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { product_id, quantity, shift } = req.body;

      const entryId = await this.entryService.createProductionEntry({
        product_id,
        quantity,
        shift,
      });

      res.status(201).json({
        success: true,
        data: { id: entryId },
        message: 'Production entry created successfully',
      });
    }
  );

  getEntries = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { from, to, product_id } = req.query as any;

      const filters: any = {};
      if (from) filters.from = new Date(from);
      if (to) filters.to = new Date(to);
      if (product_id) filters.product_id = product_id;

      const entries = await this.entryService.getProductionEntries(filters);

      res.json({
        success: true,
        data: entries,
        meta: {
          count: entries.length,
          total_quantity: entries.reduce(
            (sum, entry) => sum + Number(entry.quantity),
            0
          ),
        },
      });
    }
  );

  getTotals = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { from, to } = req.query as any;

    const filters: any = {};
    if (from) filters.from = new Date(from);
    if (to) filters.to = new Date(to);

    const totals = await this.entryService.getProductionTotals(filters);

    res.json({
      success: true,
      data: totals,
      meta: {
        count: totals.length,
        grand_total: totals.reduce((sum, item) => sum + item.total_quantity, 0),
      },
    });
  });

  getProductionSessions = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { from, to } = req.query as any;

      const filters: any = {};
      if (from) filters.from = new Date(from);
      if (to) filters.to = new Date(to);

      const sessions = await this.entryService.getProductionSessions(filters);

      res.json({
        success: true,
        data: sessions,
        meta: {
          count: sessions.length,
        },
      });
    }
  );
}
