import { prisma } from '../../../shared/database/prisma.js';
import { createError } from '../../../shared/middleware/errorHandler.js';
import type { ProductionEntry, UUID } from '../../../shared/types/common.js';
import { wsManager } from '../../../shared/websocket/manager.js';

export class ProductionEntryService {
  async createProductionEntry(data: {
    product_id: UUID;
    quantity: number;
    shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  }): Promise<UUID> {
    try {
      // Validate product exists
      const product = await prisma.product.findUnique({
        where: { id: data.product_id },
      });

      if (!product) {
        throw createError('Product not found', 404, 'product_not_found');
      }

      const entry = await prisma.productionEntry.create({
        data: {
          productId: data.product_id,
          quantity: data.quantity,
          shift: data.shift.toUpperCase() as 'MORNING' | 'AFTERNOON' | 'NIGHT',
        },
      });

      // Broadcast to directors for real-time monitoring
      wsManager.broadcastToDirectors({
        type: 'production_entry_created',
        data: {
          entryId: entry.id,
          product_name: product.name,
          quantity: data.quantity,
          shift: data.shift,
        },
      });

      return entry.id;
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to create production entry',
        500,
        'create_entry_failed'
      );
    }
  }

  async getProductionEntries(
    filters: {
      from?: Date;
      to?: Date;
      product_id?: UUID;
    } = {}
  ): Promise<(ProductionEntry & { product: any })[]> {
    try {
      const where: any = {};

      if (filters.from) {
        where.createdAt = { ...where.createdAt, gte: filters.from };
      }
      if (filters.to) {
        where.createdAt = { ...where.createdAt, lte: filters.to };
      }
      if (filters.product_id) {
        where.productId = filters.product_id;
      }

      const entries = await prisma.productionEntry.findMany({
        where,
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return entries.map((entry) => ({
        id: entry.id,
        productId: entry.productId,
        quantity: entry.quantity,
        shift: entry.shift,
        createdAt: entry.createdAt,
        duration: entry.duration,
        bateladas: entry.bateladas,
        startTime: entry.startTime,
        endTime: entry.endTime,
        product: {
          id: entry.product.id,
          name: entry.product.name,
          unit: entry.product.unit,
          type: entry.product.type,
          active: entry.product.active,
          createdAt: entry.product.createdAt,
        },
      }));
    } catch (_error) {
      throw createError(
        'Failed to fetch production entries',
        500,
        'fetch_entries_failed'
      );
    }
  }

  async getProductionTotals(
    filters: {
      from?: Date;
      to?: Date;
    } = {}
  ): Promise<
    Array<{
      product_id: UUID;
      product_name: string;
      unit: string;
      total_quantity: number;
    }>
  > {
    try {
      const where: any = {};

      if (filters.from) {
        where.createdAt = { ...where.createdAt, gte: filters.from };
      }
      if (filters.to) {
        where.createdAt = { ...where.createdAt, lte: filters.to };
      }

      const results = await prisma.productionEntry.groupBy({
        by: ['productId'],
        where,
        _sum: {
          quantity: true,
        },
      });

      const productIds = results.map((r) => r.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        orderBy: { name: 'asc' },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      return results
        .map((result) => {
          const product = productMap.get(result.productId);
          return {
            product_id: result.productId,
            product_name: product?.name || '',
            unit: product?.unit.toLowerCase() || 'kg',
            total_quantity: Number(result._sum.quantity || 0),
          };
        })
        .filter((r) => r.product_name) // Filter out entries where product wasn't found
        .sort((a, b) => a.product_name.localeCompare(b.product_name));
    } catch (_error) {
      throw createError(
        'Failed to calculate production totals',
        500,
        'totals_calculation_failed'
      );
    }
  }

  async getProductionSessions(
    filters: {
      from?: Date;
      to?: Date;
    } = {}
  ): Promise<
    Array<{
      id: UUID;
      date: string;
      shift: 'Manhã' | 'Tarde' | 'Noite';
      product: string;
      batches: number;
      totalKg: number;
      duration: number;
    }>
  > {
    try {
      const where: any = {};

      if (filters.from) {
        where.createdAt = { ...where.createdAt, gte: filters.from };
      }
      if (filters.to) {
        where.createdAt = { ...where.createdAt, lte: filters.to };
      }

      const entries = await prisma.productionEntry.findMany({
        where,
        include: {
          product: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return entries.map((entry) => {
        return {
          id: entry.id,
          date: new Date(entry.createdAt).toLocaleDateString('pt-BR'),
          shift: (entry.shift === 'MORNING'
            ? 'Manhã'
            : entry.shift === 'AFTERNOON'
              ? 'Tarde'
              : 'Noite') as 'Manhã' | 'Tarde' | 'Noite',
          product: entry.product.name,
          batches: Number(entry.bateladas),
          totalKg: Number(entry.quantity),
          duration: Number(entry.duration),
        };
      });
    } catch (_error) {
      throw createError(
        'Failed to fetch production sessions',
        500,
        'fetch_sessions_failed'
      );
    }
  }
}
