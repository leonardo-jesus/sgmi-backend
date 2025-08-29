import { prisma } from '../../../shared/database/prisma.js';
import { createError } from '../../../shared/middleware/errorHandler.js';
import type { UUID } from '../../../shared/types/common.js';

export interface ProductionReportData {
  date: string;
  shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
  product_id: UUID;
  product_name: string;
  batches_count: number;
  total_production_hours: number;
  estimated_kg: number;
  actual_kg: number;
  efficiency_percentage: number;
}

export interface ProductionSummary {
  total_batches: number;
  total_production_hours: number;
  total_estimated_kg: number;
  total_actual_kg: number;
  overall_efficiency: number;
  products_summary: Array<{
    product_id: UUID;
    product_name: string;
    batches_count: number;
    estimated_kg: number;
    actual_kg: number;
    efficiency_percentage: number;
  }>;
}

export class ReportService {
  async getProductionReport(
    filters: {
      from?: Date;
      to?: Date;
      product_id?: UUID;
    } = {}
  ): Promise<ProductionReportData[]> {
    try {
      // Get production report data using raw SQL for complex aggregation
      const whereConditions = [];
      const params = [];

      if (filters.from) {
        whereConditions.push(`pp.planned_date >= $${params.length + 1}`);
        params.push(filters.from);
      }
      if (filters.to) {
        whereConditions.push(`pp.planned_date <= $${params.length + 1}`);
        params.push(filters.to);
      }
      if (filters.product_id) {
        whereConditions.push(`pp.product_id = $${params.length + 1}`);
        params.push(filters.product_id);
      }

      const whereClause =
        whereConditions.length > 0
          ? 'WHERE ' + whereConditions.join(' AND ')
          : '';

      const reportData = (await prisma.$queryRawUnsafe(
        `
        SELECT 
          pp.planned_date::date as date,
          pp.shift,
          pp.product_id,
          p.name as product_name,
          COUNT(b.id) as batches_count,
          COALESCE(SUM(
            CASE WHEN b.start_time IS NOT NULL AND b.end_time IS NOT NULL
            THEN EXTRACT(EPOCH FROM (b.end_time - b.start_time - INTERVAL '1 minute' * b.pause_duration_minutes)) / 3600
            ELSE 0 END
          ), 0) as total_production_hours,
          COALESCE(SUM(b.estimated_kg), 0) as estimated_kg,
          COALESCE(SUM(b.actual_kg), 0) as actual_kg
        FROM production_plans pp
        JOIN products p ON p.id = pp.product_id
        LEFT JOIN batches b ON b.production_plan_id = pp.id
        ${whereClause}
        GROUP BY pp.planned_date::date, pp.shift, pp.product_id, p.name
        ORDER BY pp.planned_date DESC, pp.shift, p.name
      `,
        ...params
      )) as any[];

      return reportData.map((item) => ({
        date: item.date.toISOString().split('T')[0],
        shift: item.shift,
        product_id: item.product_id,
        product_name: item.product_name,
        batches_count: Number(item.batches_count || 0),
        total_production_hours: Number(item.total_production_hours || 0),
        estimated_kg: Number(item.estimated_kg || 0),
        actual_kg: Number(item.actual_kg || 0),
        efficiency_percentage: this.calculateEfficiency(
          Number(item.estimated_kg || 0),
          Number(item.actual_kg || 0)
        ),
      }));
    } catch (_error) {
      throw createError(
        'Failed to generate production report',
        500,
        'report_generation_failed'
      );
    }
  }

  async getProductionSummary(
    filters: {
      from?: Date;
      to?: Date;
    } = {}
  ): Promise<ProductionSummary> {
    try {
      const reportData = await this.getProductionReport(filters);

      // Calculate totals
      const totalBatches = reportData.reduce(
        (sum, item) => sum + item.batches_count,
        0
      );
      const totalProductionHours = reportData.reduce(
        (sum, item) => sum + item.total_production_hours,
        0
      );
      const totalEstimatedKg = reportData.reduce(
        (sum, item) => sum + item.estimated_kg,
        0
      );
      const totalActualKg = reportData.reduce(
        (sum, item) => sum + item.actual_kg,
        0
      );

      // Group by product for summary
      const productSummaryMap = new Map<
        UUID,
        {
          product_name: string;
          batches_count: number;
          estimated_kg: number;
          actual_kg: number;
        }
      >();

      reportData.forEach((item) => {
        const existing = productSummaryMap.get(item.product_id) || {
          product_name: item.product_name,
          batches_count: 0,
          estimated_kg: 0,
          actual_kg: 0,
        };

        existing.batches_count += item.batches_count;
        existing.estimated_kg += item.estimated_kg;
        existing.actual_kg += item.actual_kg;

        productSummaryMap.set(item.product_id, existing);
      });

      const productsSummary = Array.from(productSummaryMap.entries()).map(
        ([productId, data]) => ({
          product_id: productId,
          product_name: data.product_name,
          batches_count: data.batches_count,
          estimated_kg: data.estimated_kg,
          actual_kg: data.actual_kg,
          efficiency_percentage: this.calculateEfficiency(
            data.estimated_kg,
            data.actual_kg
          ),
        })
      );

      return {
        total_batches: totalBatches,
        total_production_hours: Math.round(totalProductionHours * 100) / 100,
        total_estimated_kg: Math.round(totalEstimatedKg * 100) / 100,
        total_actual_kg: Math.round(totalActualKg * 100) / 100,
        overall_efficiency: this.calculateEfficiency(
          totalEstimatedKg,
          totalActualKg
        ),
        products_summary: productsSummary,
      };
    } catch (_error) {
      throw createError(
        'Failed to generate production summary',
        500,
        'summary_generation_failed'
      );
    }
  }

  async getDailyProductionTrend(
    filters: {
      from?: Date;
      to?: Date;
      product_id?: UUID;
    } = {}
  ): Promise<
    Array<{
      date: string;
      total_batches: number;
      total_actual_kg: number;
      efficiency_percentage: number;
    }>
  > {
    try {
      const reportData = await this.getProductionReport(filters);

      // Group by date
      const dateMap = new Map<
        string,
        {
          batches_count: number;
          estimated_kg: number;
          actual_kg: number;
        }
      >();

      reportData.forEach((item) => {
        const existing = dateMap.get(item.date) || {
          batches_count: 0,
          estimated_kg: 0,
          actual_kg: 0,
        };

        existing.batches_count += item.batches_count;
        existing.estimated_kg += item.estimated_kg;
        existing.actual_kg += item.actual_kg;

        dateMap.set(item.date, existing);
      });

      return Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          total_batches: data.batches_count,
          total_actual_kg: Math.round(data.actual_kg * 100) / 100,
          efficiency_percentage: this.calculateEfficiency(
            data.estimated_kg,
            data.actual_kg
          ),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (_error) {
      throw createError(
        'Failed to generate daily production trend',
        500,
        'trend_generation_failed'
      );
    }
  }

  async getShiftPerformance(
    filters: {
      from?: Date;
      to?: Date;
    } = {}
  ): Promise<
    Array<{
      shift: 'MORNING' | 'AFTERNOON' | 'NIGHT';
      total_batches: number;
      total_production_hours: number;
      total_actual_kg: number;
      average_efficiency: number;
    }>
  > {
    try {
      const reportData = await this.getProductionReport(filters);

      // Group by shift
      const shiftMap = new Map<
        string,
        {
          batches_count: number;
          production_hours: number;
          estimated_kg: number;
          actual_kg: number;
          efficiency_sum: number;
          days_count: number;
        }
      >();

      reportData.forEach((item) => {
        const existing = shiftMap.get(item.shift) || {
          batches_count: 0,
          production_hours: 0,
          estimated_kg: 0,
          actual_kg: 0,
          efficiency_sum: 0,
          days_count: 0,
        };

        existing.batches_count += item.batches_count;
        existing.production_hours += item.total_production_hours;
        existing.estimated_kg += item.estimated_kg;
        existing.actual_kg += item.actual_kg;
        existing.efficiency_sum += item.efficiency_percentage;
        existing.days_count += 1;

        shiftMap.set(item.shift, existing);
      });

      return Array.from(shiftMap.entries()).map(([shift, data]) => ({
        shift: shift as 'MORNING' | 'AFTERNOON' | 'NIGHT',
        total_batches: data.batches_count,
        total_production_hours: Math.round(data.production_hours * 100) / 100,
        total_actual_kg: Math.round(data.actual_kg * 100) / 100,
        average_efficiency:
          data.days_count > 0
            ? Math.round((data.efficiency_sum / data.days_count) * 100) / 100
            : 0,
      }));
    } catch (_error) {
      throw createError(
        'Failed to generate shift performance report',
        500,
        'shift_performance_failed'
      );
    }
  }

  private calculateEfficiency(estimated: number, actual: number): number {
    if (estimated === 0) return 0;
    return Math.round((actual / estimated) * 100 * 100) / 100;
  }
}
