import type { Product } from '../types';

/**
 * Facets derived from the REAL dataset text (names + tags).
 * We only expose color/material facets that actually occur in the data —
 * nothing is invented.
 */

export const COLOR_WORDS = [
  'white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'purple',
  'grey', 'brown', 'orange', 'beige', 'gold', 'silver', 'navy',
] as const;

export const MATERIAL_WORDS = [
  'leather', 'cotton', 'steel', 'plastic', 'wood', 'rubber', 'canvas',
  'wool', 'synthetic', 'ceramic', 'glass', 'aluminium', 'aluminum', 'denim',
  'linen', 'mesh', 'foam', 'silicone', 'bamboo', 'stainless',
] as const;

const text = (p: Product) =>
  `${p.name} ${(p.tags || []).join(' ')} ${p.description}`.toLowerCase();

export function productColors(p: Product): string[] {
  const t = text(p);
  return COLOR_WORDS.filter((c) => t.includes(c));
}

export function productMaterials(p: Product): string[] {
  const t = text(p);
  return MATERIAL_WORDS.filter((m) => t.includes(m));
}

/** Facet counts for a product list — used by the filter panel. */
export function facetCounts(products: Product[], facetOf: (p: Product) => string[]) {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const f of facetOf(p)) counts.set(f, (counts.get(f) || 0) + 1);
  }
  // Only facets that actually occur, sorted by frequency
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
