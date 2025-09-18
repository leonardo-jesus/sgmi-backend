import { prisma } from '../../../shared/database/prisma.js';
import { createError } from '../../../shared/middleware/errorHandler.js';
import type {
  ProductionPlan,
  ProductionPlanStatus,
  UUID,
} from '../../../shared/types/common.js';
import { wsManager } from '../../../shared/websocket/manager.js';

export class ProductionPlanService {
  async createProductionPlan(data: {
    product_id: UUID;
    planned_quantity: number;
    planned_date: Date;
  }): Promise<UUID> {
    try {
      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: data.product_id },
      });

      if (!product) {
        throw createError('Product not found', 404, 'product_not_found');
      }

      const plan = await prisma.productionPlan.create({
        data: {
          productId: data.product_id,
          plannedQuantity: data.planned_quantity,
          plannedDate: data.planned_date,
        },
      });

      // Notify production operators
      wsManager.broadcastToBatchOperators({
        type: 'production_plan_created',
        data: { planId: plan.id, ...data, product: product.name },
      });

      return plan.id;
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to create production plan',
        500,
        'create_plan_failed'
      );
    }
  }

  async getProductionPlans(
    filters: {
      from?: Date;
      to?: Date;
      status?: ProductionPlanStatus;
    } = {}
  ): Promise<(ProductionPlan & { product: any })[]> {
    try {
      const whereClause: any = {};

      if (filters.from || filters.to) {
        whereClause.plannedDate = {};
        if (filters.from) whereClause.plannedDate.gte = filters.from;
        if (filters.to) whereClause.plannedDate.lte = filters.to;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      return await prisma.productionPlan.findMany({
        where: whereClause,
        include: {
          product: true,
          batches: true,
        },
        orderBy: { plannedDate: 'desc' },
      });
    } catch (_error) {
      throw createError(
        'Failed to fetch production plans',
        500,
        'fetch_plans_failed'
      );
    }
  }

  async updateProductionPlanStatus(
    id: UUID,
    status: ProductionPlanStatus
  ): Promise<void> {
    try {
      const plan = await prisma.productionPlan.findUnique({
        where: { id },
        include: { product: true },
      });

      if (!plan) {
        throw createError('Production plan not found', 404, 'plan_not_found');
      }

      await prisma.productionPlan.update({
        where: { id },
        data: { status },
      });

      // Broadcast status update
      wsManager.broadcastToBatchOperators({
        type: 'production_plan_status_updated',
        data: { planId: id, status, productName: plan.product.name },
      });
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to update production plan status',
        500,
        'update_plan_failed'
      );
    }
  }

  async getTotalProduction(
    filters: {
      from?: Date;
      to?: Date;
      product_id?: UUID;
    } = {}
  ): Promise<
    Array<{
      product_id: UUID;
      product_name: string;
      total_planned: number;
      total_produced: number;
      completion_percentage: number;
    }>
  > {
    try {
      // Build where clause for date and product filtering
      const dateWhere: any = {};
      if (filters.from || filters.to) {
        dateWhere.plannedDate = {};
        if (filters.from) dateWhere.plannedDate.gte = filters.from;
        if (filters.to) dateWhere.plannedDate.lte = filters.to;
      }
      if (filters.product_id) {
        dateWhere.productId = filters.product_id;
      }

      // Get planned totals grouped by product
      const plannedTotals = await prisma.productionPlan.groupBy({
        by: ['productId'],
        where: dateWhere,
        _sum: {
          plannedQuantity: true,
        },
      });

      // Get product information
      const productIds = plannedTotals.map((p) => p.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p.name]));

      // Get estimated production totals from completed batches
      const completedBatches = await prisma.batch.groupBy({
        by: ['productionPlanId'],
        where: {
          status: 'COMPLETED',
          productionPlan: dateWhere,
        },
        _sum: {
          estimatedKg: true,
        },
      });

      // Create a map of estimated production by product
      const estimatedByProduct = new Map<UUID, number>();

      for (const batch of completedBatches) {
        const plan = await prisma.productionPlan.findUnique({
          where: { id: batch.productionPlanId },
          select: { productId: true },
        });
        if (plan) {
          const current = estimatedByProduct.get(plan.productId) || 0;
          estimatedByProduct.set(
            plan.productId,
            current + Number(batch._sum.estimatedKg || 0)
          );
        }
      }

      return plannedTotals.map((planned) => {
        const totalProduced = estimatedByProduct.get(planned.productId) || 0;
        const totalPlanned = Number(planned._sum.plannedQuantity || 0);

        return {
          product_id: planned.productId,
          product_name: productMap.get(planned.productId) || 'Unknown',
          total_planned: totalPlanned,
          total_produced: totalProduced,
          completion_percentage:
            totalPlanned > 0
              ? Math.round((totalProduced / totalPlanned) * 100)
              : 0,
        };
      });
    } catch (_error) {
      throw createError(
        'Failed to calculate total production',
        500,
        'total_production_failed'
      );
    }
  }
}
