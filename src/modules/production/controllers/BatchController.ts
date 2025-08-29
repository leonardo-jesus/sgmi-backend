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
      const { production_plan_id, batch_number, estimated_kg } = req.body;

      const batchId = await this.batchService.createBatch({
        production_plan_id,
        batch_number,
        estimated_kg,
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
      const { batchId } = req.params;
      const { action, actual_kg } = req.body;

      await this.batchService.performBatchAction(batchId, {
        action,
        actual_kg,
      });

      res.json({
        success: true,
        message: `Batch ${action} performed successfully`,
      });
    }
  );

  getBatchStatus = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { batchId } = req.params;

      const batchStatus = await this.batchService.getBatchStatus(batchId);

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

    if (batch.actual_kg && batch.estimated_kg > 0) {
      metrics.efficiency_percentage =
        Math.round((batch.actual_kg / batch.estimated_kg) * 100 * 100) / 100;
    }

    return metrics;
  }
}
