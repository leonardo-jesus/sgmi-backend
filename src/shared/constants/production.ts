// Batch weight constants for calculating production amounts
// Each product type has a different weight per batch

export const BATCH_WEIGHTS = {
  AMANTEIGADO: 110, // kg per batch
  DOCE: 120, // kg per batch
  FLOCO: 172, // kg per batch
} as const;

export type ProductType = 'AMANTEIGADO' | 'DOCE' | 'FLOCO';

// Calculate kg produced from batch count
export const calculateKgFromBatches = (
  productType: ProductType,
  batchCount: number
): number => {
  const weightPerBatch = BATCH_WEIGHTS[productType];
  return weightPerBatch * batchCount;
};
