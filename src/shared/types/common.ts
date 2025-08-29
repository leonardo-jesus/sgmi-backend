import type {
  BatchStatus,
  Batch as PrismaBatch,
  Product as PrismaProduct,
  ProductionEntry as PrismaProductionEntry,
  ProductionPlan as PrismaProductionPlan,
  User as PrismaUser,
  ProductionPlanStatus,
  ProductUnit,
  Shift,
  UserRole,
} from '@prisma/client';

// Re-export Prisma enums
export { BatchStatus, ProductionPlanStatus, ProductUnit, Shift, UserRole };

// Type aliases for consistency
export type UUID = string;
export type Unit = ProductUnit;
export type PlanStatus = ProductionPlanStatus;

// Extended types with relations
export interface User extends PrismaUser {}

export interface Product extends PrismaProduct {}

export interface ProductionEntry extends PrismaProductionEntry {
  product?: Product;
}

export interface ProductionPlan extends PrismaProductionPlan {
  product?: Product;
  batches?: Batch[];
}

export interface Batch extends PrismaBatch {
  productionPlan?: ProductionPlan;
}

// For backward compatibility with existing code
export interface ProductWithRelations extends Product {
  productionPlans?: ProductionPlan[];
  productionEntries?: ProductionEntry[];
}

export interface ProductionPlanWithRelations extends ProductionPlan {
  product: Product;
  batches: Batch[];
}

export interface BatchWithRelations extends Batch {
  productionPlan: ProductionPlan & { product: Product };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DateRangeParams {
  from?: string;
  to?: string;
}
