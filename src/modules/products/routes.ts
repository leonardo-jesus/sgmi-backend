import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../shared/middleware/auth.js';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../shared/middleware/validation.js';
import {
  CreateProductSchema,
  UpdateProductSchema,
  UuidParamSchema,
} from '../../shared/validation/schemas.js';
import { ProductController } from './ProductController.js';

const router = Router();
const productController = new ProductController();

// All product routes require authentication
router.use(authenticate);

// Get all products (available to all authenticated users)
router.get(
  '/',
  validateQuery(
    z.object({
      include_inactive: z.string().optional(),
    })
  ),
  productController.getAllProducts
);

// Get product by ID (available to all authenticated users)
router.get(
  '/:id',
  validateParams(UuidParamSchema),
  productController.getProductById
);

// Get product usage stats (available to managers and directors)
router.get(
  '/:id/usage-stats',
  authorize(['MANAGER', 'DIRECTOR']),
  validateParams(UuidParamSchema),
  productController.getProductUsageStats
);

// Create product (managers and directors only)
router.post(
  '/',
  authorize(['MANAGER', 'DIRECTOR']),
  validateBody(CreateProductSchema),
  productController.createProduct
);

// Update product (managers and directors only)
router.put(
  '/:id',
  authorize(['MANAGER', 'DIRECTOR']),
  validateParams(UuidParamSchema),
  validateBody(UpdateProductSchema),
  productController.updateProduct
);

// Deactivate product (managers and directors only)
router.patch(
  '/:id/deactivate',
  authorize(['MANAGER', 'DIRECTOR']),
  validateParams(UuidParamSchema),
  productController.deactivateProduct
);

// Reactivate product (managers and directors only)
router.patch(
  '/:id/reactivate',
  authorize(['MANAGER', 'DIRECTOR']),
  validateParams(UuidParamSchema),
  productController.reactivateProduct
);

// Delete product (directors only)
router.delete(
  '/:id',
  authorize(['DIRECTOR']),
  validateParams(UuidParamSchema),
  productController.deleteProduct
);

export { router as productsRouter };
