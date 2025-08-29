import { prisma } from '../../shared/database/prisma.js';
import { createError } from '../../shared/middleware/errorHandler.js';
import type { Product, ProductUnit, UUID } from '../../shared/types/common.js';

export interface CreateProductData {
  name: string;
  unit: ProductUnit;
  active?: boolean;
}

export interface UpdateProductData {
  name?: string;
  unit?: ProductUnit;
  active?: boolean;
}

export class ProductService {
  async getAllProducts(includeInactive = false): Promise<Product[]> {
    try {
      return await prisma.product.findMany({
        where: includeInactive ? {} : { active: true },
        orderBy: { name: 'asc' },
      });
    } catch (_error) {
      throw createError(
        'Failed to fetch products',
        500,
        'fetch_products_failed'
      );
    }
  }

  async getProductById(id: UUID): Promise<Product | null> {
    try {
      return await prisma.product.findUnique({
        where: { id },
      });
    } catch (_error) {
      throw createError('Failed to fetch product', 500, 'fetch_product_failed');
    }
  }

  async createProduct(data: CreateProductData): Promise<UUID> {
    try {
      // Check if product with same name already exists
      const existingProduct = await prisma.product.findFirst({
        where: {
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
        },
      });

      if (existingProduct) {
        throw createError(
          'Product with this name already exists',
          409,
          'product_name_exists'
        );
      }

      const product = await prisma.product.create({
        data: {
          name: data.name,
          unit: data.unit,
          active: data.active ?? true,
        },
      });

      return product.id;
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to create product',
        500,
        'create_product_failed'
      );
    }
  }

  async updateProduct(id: UUID, data: UpdateProductData): Promise<void> {
    try {
      const existingProduct = await this.getProductById(id);

      if (!existingProduct) {
        throw createError('Product not found', 404, 'product_not_found');
      }

      // If name is being updated, check for conflicts
      if (
        data.name &&
        data.name.toLowerCase() !== existingProduct.name.toLowerCase()
      ) {
        const conflictingProduct = await prisma.product.findFirst({
          where: {
            id: { not: id },
            name: {
              equals: data.name,
              mode: 'insensitive',
            },
          },
        });

        if (conflictingProduct) {
          throw createError(
            'Product with this name already exists',
            409,
            'product_name_exists'
          );
        }
      }

      await prisma.product.update({
        where: { id },
        data,
      });
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to update product',
        500,
        'update_product_failed'
      );
    }
  }

  async deleteProduct(id: UUID): Promise<void> {
    try {
      const existingProduct = await this.getProductById(id);

      if (!existingProduct) {
        throw createError('Product not found', 404, 'product_not_found');
      }

      // Check if product is being used in production plans or entries
      const productUsage = await this.checkProductUsage(id);

      if (productUsage.hasPlans || productUsage.hasEntries) {
        throw createError(
          'Cannot delete product that is referenced in production plans or entries. Deactivate it instead.',
          409,
          'product_in_use'
        );
      }

      await prisma.product.delete({
        where: { id },
      });
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to delete product',
        500,
        'delete_product_failed'
      );
    }
  }

  async deactivateProduct(id: UUID): Promise<void> {
    try {
      await this.updateProduct(id, { active: false });
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to deactivate product',
        500,
        'deactivate_product_failed'
      );
    }
  }

  async reactivateProduct(id: UUID): Promise<void> {
    try {
      await this.updateProduct(id, { active: true });
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to reactivate product',
        500,
        'reactivate_product_failed'
      );
    }
  }

  async getProductUsageStats(id: UUID): Promise<{
    total_production_plans: number;
    total_production_entries: number;
    total_batches: number;
    last_used_date: Date | null;
  }> {
    try {
      const product = await this.getProductById(id);

      if (!product) {
        throw createError('Product not found', 404, 'product_not_found');
      }

      // Count production plans
      const planCount = await prisma.productionPlan.count({
        where: { productId: id },
      });

      // Count production entries
      const entryCount = await prisma.productionEntry.count({
        where: { productId: id },
      });

      // Count batches through production plans
      const batchCount = await prisma.batch.count({
        where: {
          productionPlan: {
            productId: id,
          },
        },
      });

      // Get last used date (most recent from either plans or entries)
      const lastPlan = await prisma.productionPlan.findFirst({
        where: { productId: id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const lastEntry = await prisma.productionEntry.findFirst({
        where: { productId: id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      let lastUsedDate: Date | null = null;
      if (lastPlan && lastEntry) {
        lastUsedDate = new Date(
          Math.max(lastPlan.createdAt.getTime(), lastEntry.createdAt.getTime())
        );
      } else if (lastPlan) {
        lastUsedDate = lastPlan.createdAt;
      } else if (lastEntry) {
        lastUsedDate = lastEntry.createdAt;
      }

      return {
        total_production_plans: planCount,
        total_production_entries: entryCount,
        total_batches: batchCount,
        last_used_date: lastUsedDate,
      };
    } catch (_error) {
      if (_error instanceof Error && 'statusCode' in _error) {
        throw _error;
      }
      throw createError(
        'Failed to get product usage stats',
        500,
        'usage_stats_failed'
      );
    }
  }

  private async checkProductUsage(id: UUID): Promise<{
    hasPlans: boolean;
    hasEntries: boolean;
  }> {
    const planCount = await prisma.productionPlan.count({
      where: { productId: id },
    });

    const entryCount = await prisma.productionEntry.count({
      where: { productId: id },
    });

    return {
      hasPlans: planCount > 0,
      hasEntries: entryCount > 0,
    };
  }
}
