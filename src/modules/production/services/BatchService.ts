import { prisma } from '../../../shared/database/prisma.js';
import { createError } from '../../../shared/middleware/errorHandler.js';
import type { Batch, BatchStatus, UUID } from '../../../shared/types/common.js';
// COMMENTED OUT FOR WEBSOCKET REFACTOR - DO NOT DELETE
// import { wsManager } from '../../../shared/websocket/manager.js';
import {
  calculateKgFromBatches,
  type ProductType,
} from '../../../shared/constants/production.js';

export interface BatchAction {
  action: 'start' | 'pause' | 'resume' | 'complete' | 'stop';
}

export class BatchService {
  private pauseStartTimes: Map<UUID, Date> = new Map();

  async createBatch(data: {
    production_plan_id: UUID;
    batch_number: number;
    batch_count: number;
  }): Promise<UUID> {
    try {
      // Verify production plan exists
      const plan = await prisma.productionPlan.findUnique({
        where: { id: data.production_plan_id },
        include: { product: true },
      });

      if (!plan) {
        throw createError(
          'Production plan not found',
          404,
          'production_plan_not_found'
        );
      }

      // Check if batch number already exists for this plan
      const duplicateBatch = await prisma.batch.findUnique({
        where: {
          productionPlanId_batchNumber: {
            productionPlanId: data.production_plan_id,
            batchNumber: data.batch_number,
          },
        },
      });

      if (duplicateBatch) {
        throw createError(
          'Batch number already exists for this production plan',
          409,
          'batch_number_conflict'
        );
      }

      // Calculate estimated KG from batch count and product type
      const productType = plan.product.type as ProductType;
      const estimatedKg = calculateKgFromBatches(productType, data.batch_count);

      const batch = await prisma.batch.create({
        data: {
          productionPlanId: data.production_plan_id,
          batchNumber: data.batch_number,
          estimatedKg,
          status: 'PLANNED',
        },
      });

      // COMMENTED OUT FOR WEBSOCKET REFACTOR - DO NOT DELETE
      // Broadcast batch creation
      // wsManager.broadcastToBatchOperators({
      //   type: 'batch_created',
      //   data: {
      //     batchId: batch.id,
      //     production_plan_id: data.production_plan_id,
      //     batch_number: data.batch_number,
      //     product_name: plan.product?.name,
      //     estimated_kg: estimatedKg,
      //   },
      // });

      return batch.id;
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError('Failed to create batch', 500, 'create_batch_failed');
    }
  }

  async getBatchesByPlan(production_plan_id: UUID): Promise<Batch[]> {
    try {
      const batches = await prisma.batch.findMany({
        where: { productionPlanId: production_plan_id },
        orderBy: { batchNumber: 'asc' },
      });

      return batches.map((batch) => ({
        id: batch.id,
        productionPlanId: batch.productionPlanId,
        batchNumber: batch.batchNumber,
        status: batch.status,
        startTime: batch.startTime,
        endTime: batch.endTime,
        pauseDurationMinutes: batch.pauseDurationMinutes,
        estimatedKg: batch.estimatedKg,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      }));
    } catch (_error) {
      throw createError('Failed to fetch batches', 500, 'fetch_batches_failed');
    }
  }

  async performBatchAction(batchId: UUID, action: BatchAction): Promise<void> {
    try {
      // Get current batch state
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
      });

      if (!batch) {
        throw createError('Batch not found', 404, 'batch_not_found');
      }

      const currentStatus = batch.status;
      const now = new Date();

      let newStatus: BatchStatus = currentStatus;
      const updateData: any = {};

      // Validate and perform action
      switch (action.action) {
        case 'start':
          if (currentStatus !== 'PLANNED') {
            throw createError(
              'Batch can only be started from planned status',
              400,
              'invalid_batch_action'
            );
          }
          newStatus = 'IN_PROGRESS';
          updateData.startTime = now;
          updateData.status = 'IN_PROGRESS';
          break;

        case 'pause':
          if (currentStatus !== 'IN_PROGRESS') {
            throw createError(
              'Batch can only be paused from in_progress status',
              400,
              'invalid_batch_action'
            );
          }
          newStatus = 'PAUSED';
          updateData.status = 'PAUSED';
          this.pauseStartTimes.set(batchId, now);
          break;

        case 'resume':
          if (currentStatus !== 'PAUSED') {
            throw createError(
              'Batch can only be resumed from paused status',
              400,
              'invalid_batch_action'
            );
          }
          newStatus = 'IN_PROGRESS';
          updateData.status = 'IN_PROGRESS';

          // Calculate pause duration
          const pauseStart = this.pauseStartTimes.get(batchId);
          if (pauseStart) {
            const pauseDurationMs = now.getTime() - pauseStart.getTime();
            const pauseDurationMinutes = Math.round(pauseDurationMs / 60000);
            updateData.pauseDurationMinutes =
              batch.pauseDurationMinutes + pauseDurationMinutes;
            this.pauseStartTimes.delete(batchId);
          }
          break;

        case 'complete':
          if (currentStatus !== 'IN_PROGRESS') {
            throw createError(
              'Batch can only be completed from in_progress status',
              400,
              'invalid_batch_action'
            );
          }
          newStatus = 'COMPLETED';
          updateData.status = 'COMPLETED';
          updateData.endTime = now;
          break;

        case 'stop':
          if (!['IN_PROGRESS', 'PAUSED'].includes(currentStatus)) {
            throw createError(
              'Batch can only be stopped from in_progress or paused status',
              400,
              'invalid_batch_action'
            );
          }
          newStatus = 'STOPPED';
          updateData.status = 'STOPPED';
          updateData.endTime = now;

          // Handle pause cleanup if stopping from paused state
          if (currentStatus === 'PAUSED') {
            const pauseStart = this.pauseStartTimes.get(batchId);
            if (pauseStart) {
              const pauseDurationMs = now.getTime() - pauseStart.getTime();
              const pauseDurationMinutes = Math.round(pauseDurationMs / 60000);
              updateData.pauseDurationMinutes =
                batch.pauseDurationMinutes + pauseDurationMinutes;
              this.pauseStartTimes.delete(batchId);
            }
          }
          break;

        default:
          throw createError('Invalid batch action', 400, 'invalid_action');
      }

      // Update batch status
      await prisma.batch.update({
        where: { id: batchId },
        data: updateData,
      });

      // Get updated batch with production plan info for broadcast
      const updatedBatch = await this.getBatchWithPlanInfo(batchId);

      // COMMENTED OUT FOR WEBSOCKET REFACTOR - DO NOT DELETE
      // Broadcast status change
      // wsManager.broadcast({
      //   type: 'batch_status_updated',
      //   data: {
      //     batchId,
      //     batch_number: updatedBatch.batch_number,
      //     production_plan_id: updatedBatch.production_plan_id,
      //     product_name: updatedBatch.product_name,
      //     previous_status: currentStatus,
      //     new_status: newStatus,
      //     action: action.action,
      //     timestamp: now,
      //   },
      // });

      // If batch is completed, check if all batches in plan are done
      if (newStatus === 'COMPLETED') {
        await this.checkAndUpdatePlanCompletion(batch.productionPlanId);
      }
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to perform batch action',
        500,
        'batch_action_failed'
      );
    }
  }

  async getBatchStatus(batchId: UUID): Promise<{
    id: UUID;
    status: BatchStatus;
    start_time?: Date;
    end_time?: Date;
    pause_duration_minutes: number;
    estimated_kg: number;
    production_plan_id: UUID;
    batch_number: number;
  }> {
    try {
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
      });

      if (!batch) {
        throw createError('Batch not found', 404, 'batch_not_found');
      }

      return {
        id: batch.id,
        status: batch.status,
        start_time: batch.startTime || undefined,
        end_time: batch.endTime || undefined,
        pause_duration_minutes: batch.pauseDurationMinutes,
        estimated_kg: Number(batch.estimatedKg),
        production_plan_id: batch.productionPlanId,
        batch_number: batch.batchNumber,
      };
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to get batch status',
        500,
        'get_batch_status_failed'
      );
    }
  }

  private async getBatchWithPlanInfo(batchId: UUID): Promise<any> {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        productionPlan: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!batch) return null;

    return {
      ...batch,
      product_name: batch.productionPlan.product.name,
      production_plan_id: batch.productionPlanId,
      batch_number: batch.batchNumber,
    };
  }

  // NEW SIMPLIFIED BATCH CREATION METHOD
  async createSimpleBatch(data: {
    product: string;
    shift: string; // "MANHÃ" | "TARDE" | "NOITE"
    date: string; // DD-MM-YYYY format
    bateladas: number;
    duration: number; // duration in minutes
  }): Promise<{
    batchId: UUID;
    productionPlanId: UUID;
  }> {
    try {
      // Find product by name
      const product = await prisma.product.findFirst({
        where: { name: data.product },
      });

      if (!product) {
        throw createError(
          `Product "${data.product}" not found`,
          404,
          'product_not_found'
        );
      }

      // Convert date from DD-MM-YYYY to ISO format
      const [day, month, year] = data.date.split('-');
      const plannedDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

      // Map shift to backend format
      const shiftMapping: Record<string, 'MORNING' | 'AFTERNOON' | 'NIGHT'> = {
        MANHÃ: 'MORNING',
        TARDE: 'AFTERNOON',
        NOITE: 'NIGHT',
      };
      const backendShift = shiftMapping[data.shift];

      if (!backendShift) {
        throw createError(`Invalid shift: ${data.shift}`, 400, 'invalid_shift');
      }

      // Create production plan
      const productionPlan = await prisma.productionPlan.create({
        data: {
          productId: product.id,
          plannedQuantity: data.bateladas * 25, // Estimate 25kg per batch
          shift: backendShift,
          plannedDate,
          status: 'COMPLETED', // Mark as completed since it's already done
        },
      });

      // Calculate estimated KG from batch count and product type
      const productType = product.type as ProductType;
      const estimatedKg = calculateKgFromBatches(productType, data.bateladas);

      // Create the batch with completed status and duration
      const now = new Date();
      const startTime = new Date(now.getTime() - data.duration * 60 * 1000); // Calculate start time based on duration

      const batch = await prisma.batch.create({
        data: {
          productionPlanId: productionPlan.id,
          batchNumber: 1,
          estimatedKg,
          status: 'COMPLETED',
          startTime,
          endTime: now,
          pauseDurationMinutes: 0,
        },
      });

      return {
        batchId: batch.id,
        productionPlanId: productionPlan.id,
      };
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to create simple batch',
        500,
        'create_simple_batch_failed'
      );
    }
  }

  private async checkAndUpdatePlanCompletion(
    production_plan_id: UUID
  ): Promise<void> {
    try {
      const batches = await prisma.batch.findMany({
        where: { productionPlanId: production_plan_id },
      });
      const allCompleted = batches.every(
        (batch) => batch.status === 'COMPLETED'
      );

      if (allCompleted && batches.length > 0) {
        await prisma.productionPlan.update({
          where: { id: production_plan_id },
          data: { status: 'COMPLETED' },
        });

        // Broadcast plan completion
        const planInfo = await prisma.productionPlan.findUnique({
          where: { id: production_plan_id },
          include: { product: true },
        });

        if (planInfo) {
          // COMMENTED OUT FOR WEBSOCKET REFACTOR - DO NOT DELETE
          // wsManager.broadcastToDirectors({
          //   type: 'production_plan_completed',
          //   data: {
          //     production_plan_id,
          //     product_name: planInfo.product.name,
          //     planned_date: planInfo.plannedDate,
          //     shift: planInfo.shift,
          //     total_batches: batches.length,
          //   },
          // });
        }
      }
    } catch (_error) {
      console.error('Error checking plan completion:', _error);
    }
  }
}
