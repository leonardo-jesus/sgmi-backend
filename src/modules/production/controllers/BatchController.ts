import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../shared/middleware/auth.js';
import { asyncHandler } from '../../../shared/middleware/errorHandler.js';
import { BatchService } from '../services/BatchService.js';

export class BatchController {
  private batchService: BatchService;

  constructor() {
    this.batchService = new BatchService();
  }

  createBatch = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { production_plan_id, batch_number, batch_count } = req.body;

      const batchId = await this.batchService.createBatch({
        production_plan_id,
        batch_number,
        batch_count,
      });

      res.status(201).json({
        success: true,
        data: { id: batchId },
        message: 'Batch created successfully',
      });
    }
  );

  getBatches = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { planId } = req.params;

      const batches = await this.batchService.getBatchesByPlan(planId);

      res.json({
        success: true,
        data: batches,
        meta: {
          count: batches.length,
          plan_id: planId,
          status_summary: this.generateStatusSummary(batches),
        },
      });
    }
  );

  performAction = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const { action } = req.body;

      await this.batchService.performBatchAction(id, {
        action,
      });

      res.json({
        success: true,
        message: `Batch ${action} performed successfully`,
      });
    }
  );

  getBatchStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      const batchStatus = await this.batchService.getBatchStatus(id);

      // Calculate additional metrics
      const metrics = this.calculateBatchMetrics(batchStatus);

      res.json({
        success: true,
        data: {
          ...batchStatus,
          metrics,
        },
      });
    }
  );

  // NEW SIMPLIFIED BATCH CREATION ENDPOINT
  createSimpleBatch = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { product, shift, date, bateladas, duration } = req.body;

      // This will create a production plan and batch in one go
      // with the completed status and duration already set
      const result = await this.batchService.createSimpleBatch({
        product,
        shift,
        date,
        bateladas,
        duration,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Batch created successfully',
      });
    }
  );

  // FIND ACTIVE SESSION ENDPOINT
  findActiveSession = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { product, shift, date } = req.query;

      if (!product || !shift || !date) {
        return res.status(400).json({
          success: false,
          message: 'Product, shift, and date are required',
        });
      }

      const activeSession = await this.batchService.findActiveSession({
        product: product as string,
        shift: shift as string,
        date: date as string,
      });

      res.json({
        success: true,
        data: activeSession,
        message: activeSession ? 'Active session found' : 'No active session found',
      });
    }
  );

  private generateStatusSummary(batches: any[]): Record<string, number> {
    return batches.reduce((summary, batch) => {
      summary[batch.status] = (summary[batch.status] || 0) + 1;
      return summary;
    }, {});
  }

  private calculateBatchMetrics(batch: any): {
    duration_minutes?: number;
    effective_duration_minutes?: number;
    efficiency_percentage?: number;
  } {
    const metrics: any = {};

    if (batch.start_time && batch.end_time) {
      const totalDurationMs =
        batch.end_time.getTime() - batch.start_time.getTime();
      metrics.duration_minutes = Math.round(totalDurationMs / 60000);

      metrics.effective_duration_minutes = Math.max(
        0,
        metrics.duration_minutes - batch.pause_duration_minutes
      );
    }

    return metrics;
  }
}
