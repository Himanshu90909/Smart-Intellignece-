import type { Filters, Product, SortKey } from '../types';
import { productColors, productMaterials } from './facets';

export const MAX_PRICE = 5000;
export const PRICE_BUCKETS = [500, 1000, 2000, 3000, 4000, MAX_PRICE];

export const emptyFilters = (): Filters => ({
  categories: [],
  brands: [],
  minPrice: null,
  maxPrice: null,
  minRating: null,
  minDiscount: null,
  availableOnly: false,
  colors: [],
  materials: [],
});

export function matchesFilters(p: Product, f: Filters): boolean {
  if (f.categories.length && !f.categories.some((c) => p.category === c)) return false;
  if (f.brands.length && !f.brands.includes(p.brand)) return false;
  if (f.minPrice !== null && p.price < f.minPrice) return false;
  if (f.maxPrice !== null && p.price > f.maxPrice) return false;
  if (f.minRating !== null && p.rating < f.minRating) return false;
  if (f.minDiscount !== null) {
    const d = Math.round((1 - p.price / p.orig) * 100);
    if (d < f.minDiscount) return false;
  }
  if (f.availableOnly && p.available === false) return false;
  if (f.colors.length) {
    const pc = productColors(p);
    if (!f.colors.some((c) => pc.includes(c))) return false;
  }
  if (f.materials.length) {
    const pm = productMaterials(p);
    if (!f.materials.some((m) => pm.includes(m))) return false;
  }
  return true;
}

export function countActiveFilters(f: Filters): number {
  let n = 0;
  n += f.categories.length;
  n += f.brands.length;
  n += f.colors.length;
  n += f.materials.length;
  n += f.minPrice !== null ? 1 : 0;
  n += f.maxPrice !== null ? 1 : 0;
  n += f.minRating !== null ? 1 : 0;
  n += f.minDiscount !== null ? 1 : 0;
  n += f.availableOnly ? 1 : 0;
  return n;
}

export function applySorting(products: Product[], sort: SortKey): Product[] {
  const out = [...products];
  switch (sort) {
    case 'price-asc': return out.sort((a, b) => a.price - b.price);
    case 'price-desc': return out.sort((a, b) => b.price - a.price);
    case 'rating-desc': return out.sort((a, b) => b.rating - a.rating);
    case 'reviews-desc': return out.sort((a, b) => b.reviews - a.reviews);
    case 'discount-desc':
      return out.sort((a, b) => (1 - b.price / b.orig) - (1 - a.price / a.orig));
    default: return out;
  }
}

/** Paginate with a stable slice — keeps DOM size bounded for 300+ products. */
export function paginate<T>(items: T[], page: number, perPage: number): T[] {
  return items.slice((page - 1) * perPage, page * perPage);
}
