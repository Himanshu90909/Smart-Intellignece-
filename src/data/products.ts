import raw from './products.json';
import type { Product } from '../types';

/** The original 300-product catalog, as shipped with the vanilla app. */
export const products: Product[] = (raw as Product[]).map((p) => ({
  ...p,
  // Deterministic pseudo-availability: ~92% of items in stock.
  available: (p.id * 7) % 25 !== 0,
}));

export const BRANDS = [...new Set(products.map((p) => p.brand))].sort();
