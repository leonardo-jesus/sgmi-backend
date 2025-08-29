import { z } from 'zod';

// Common schemas
export const UuidSchema = z.string().uuid();
export const DateStringSchema = z.string().datetime().optional();
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const DateRangeSchema = z.object({
  from: DateStringSchema,
  to: DateStringSchema,
});

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(3, 'Password must be at least 3 characters'),
});

export const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['OPERATOR', 'DIRECTOR', 'MANAGER']).default('OPERATOR'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Product schemas
export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  unit: z
    .enum(['kg', 'un'], {
      errorMap: () => ({ message: 'Unit must be either kg or un' }),
    })
    .default('kg'),
  active: z.boolean().optional().default(true),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.enum(['kg', 'un']).optional(),
  active: z.boolean().optional(),
});

// Production Plan schemas (Director module)
export const CreateProductionPlanSchema = z.object({
  product_id: UuidSchema,
  planned_quantity: z.number().positive('Planned quantity must be positive'),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT'], {
    errorMap: () => ({ message: 'Shift must be morning, afternoon, or night' }),
  }),
  planned_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export const ProductionPlanQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  product_id: UuidSchema.optional(),
});

export const UpdateProductionPlanStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed']),
});

// Production Entry schemas (legacy/Production module)
export const CreateProductionEntrySchema = z.object({
  product_id: UuidSchema,
  quantity: z.number().positive('Quantity must be positive'),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).default('MORNING'),
});

export const ProductionEntryQuerySchema = z.object({
  from: DateStringSchema,
  to: DateStringSchema,
  product_id: UuidSchema.optional(),
});

// Batch schemas (Production module)
export const CreateBatchSchema = z.object({
  production_plan_id: UuidSchema,
  batch_number: z.number().int().positive('Batch number must be positive'),
  estimated_kg: z.number().positive('Estimated KG must be positive'),
});

export const UpdateBatchStatusSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'paused', 'completed', 'stopped']),
  actual_kg: z.number().positive().optional(),
});

export const BatchActionSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'complete', 'stop']),
  actual_kg: z.number().positive().optional(),
});

// Report schemas
export const ProductionReportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  product_id: UuidSchema.optional(),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT']).optional(),
});

// WebSocket schemas
export const WebSocketMessageSchema = z.object({
  type: z.string(),
  data: z.any().optional(),
  timestamp: z.date().optional(),
});

// Parameter schemas
export const UuidParamSchema = z.object({
  id: UuidSchema,
});

export const BatchParamSchema = z.object({
  planId: UuidSchema,
  batchId: UuidSchema,
});
