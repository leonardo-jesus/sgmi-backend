import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.js';
import { asyncHandler } from '../../shared/middleware/errorHandler.js';
import { ProductService } from './ProductService.js';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  getAllProducts = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { include_inactive } = req.query;

      const products = await this.productService.getAllProducts(
        include_inactive === 'true'
      );

      res.json({
        success: true,
        data: products,
        meta: {
          count: products.length,
          active_count: products.filter((p) => p.active).length,
          inactive_count: products.filter((p) => !p.active).length,
        },
      });
    }
  );

  getProductById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      const product = await this.productService.getProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'product_not_found',
          message: 'Product not found',
        });
      }

      res.json({
        success: true,
        data: product,
      });
    }
  );

  createProduct = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { name, unit, active } = req.body;

      const productId = await this.productService.createProduct({
        name,
        unit,
        active,
      });

      res.status(201).json({
        success: true,
        data: { id: productId },
        message: 'Product created successfully',
      });
    }
  );

  updateProduct = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const { name, unit, active } = req.body;

      await this.productService.updateProduct(id, {
        name,
        unit,
        active,
      });

      res.json({
        success: true,
        message: 'Product updated successfully',
      });
    }
  );

  deleteProduct = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      await this.productService.deleteProduct(id);

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    }
  );

  deactivateProduct = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      await this.productService.deactivateProduct(id);

      res.json({
        success: true,
        message: 'Product deactivated successfully',
      });
    }
  );

  reactivateProduct = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      await this.productService.reactivateProduct(id);

      res.json({
        success: true,
        message: 'Product reactivated successfully',
      });
    }
  );

  getProductUsageStats = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;

      const stats = await this.productService.getProductUsageStats(id);

      res.json({
        success: true,
        data: stats,
      });
    }
  );
}
