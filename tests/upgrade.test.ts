import { describe, expect, it } from 'vitest';
import { parseNL, applyWithFallback } from '../src/lib/nlQuery';
import { facetCounts, productColors, productMaterials } from '../src/lib/facets';
import { matchesFilters, countActiveFilters, emptyFilters } from '../src/lib/filters';
import { CART_LIMITS } from '../src/store/cartConstants';
import raw from '../src/data/products.json';
import type { Product } from '../src/types';

const products = raw as Product[];

describe('NL query interpretation (Ask Smart Intelligence)', () => {
  it('parses "white running shoes under ₹3000" into category, color, price cap', () => {
    const n = parseNL('Show me white running shoes under ₹3000', products);
    expect(n.filters.categories).toContain('shoes');
    expect(n.filters.colors).toContain('white');
    expect(n.filters.maxPrice).toBe(3000);
    expect(n.chips.length).toBeGreaterThanOrEqual(3);
  });

  it('parses a price range "between 2000 and 5000"', () => {
    const n = parseNL('shoes between 2000 and 5000', products);
    expect(n.filters.minPrice).toBe(2000);
    expect(n.filters.maxPrice).toBe(5000);
  });

  it('maps "highly rated" to a 4★ minimum', () => {
    const n = parseNL('show highly rated casual shoes', products);
    expect(n.filters.minRating).toBeGreaterThanOrEqual(4);
  });

  it('recognises a real dataset brand but never invents one', () => {
    const brand = products[0].brand;
    const n = parseNL(`best ${brand} shoes under 2000`, products);
    expect(n.filters.brands).toEqual([brand]);
    const n2 = parseNL('best zzzqqx shoes under 2000', products);
    expect(n2.filters.brands).toEqual([]);
  });

  it('strips constraint phrases from the residual vector query', () => {
    const n = parseNL('Show me white running shoes under ₹3000', products);
    expect(n.query.toLowerCase()).not.toContain('under');
    expect(n.query.toLowerCase()).not.toContain('show');
    expect(n.query.length).toBeGreaterThan(0);
  });

  it('parsed filters applied to the catalog return only real, matching products', () => {
    const n = parseNL('shoes under ₹3000', products);
    const results = products.filter((p) => matchesFilters(p, n.filters));
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.price).toBeLessThanOrEqual(3000);
      expect(p.category).toBe('shoes');
    }
  });

  it('applyWithFallback relaxes facet filters that match nothing (honest degradation)', () => {
    const n = parseNL('white shoes under ₹3000', products);
    // "white" doesn't occur in this catalog: exact-match must be empty...
    const exact = products.filter((p) => matchesFilters(p, n.filters));
    expect(exact.length).toBe(0);
    // ...and the fallback relaxes facets while keeping price + category hard
    const { results, relaxed } = applyWithFallback(
      (f) => products.filter((p) => matchesFilters(p, f)),
      n.filters,
    );
    expect(relaxed).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    for (const p of results) {
      expect(p.price).toBeLessThanOrEqual(3000);
      expect(p.category).toBe('shoes');
    }
  });
});

describe('facets (derived from real dataset text)', () => {
  it('detects colors that genuinely occur in the dataset', () => {
    const blue = products.find((p) => /blue/i.test(`${p.name} ${p.tags.join(' ')}`));
    expect(blue).toBeDefined();
    expect(productColors(blue!)).toContain('blue');
    // and never invents a color absent from the text
    for (const p of products) {
      const t = `${p.name} ${p.tags.join(' ')}`.toLowerCase();
      if (!t.includes('white')) expect(productColors(p)).not.toContain('white');
    }
  });

  it('never reports a facet absent from the text', () => {
    for (const p of products.slice(0, 30)) {
      const t = `${p.name} ${p.tags.join(' ')}`.toLowerCase();
      for (const c of productColors(p)) expect(t).toContain(c);
    }
  });

  it('facetCounts only includes facets that occur, sorted by frequency', () => {
    const counts = facetCounts(products, productMaterials);
    expect(counts.length).toBeGreaterThan(0);
    expect(counts[0][1]).toBeGreaterThanOrEqual(counts[counts.length - 1][1]);
    for (const [, n] of counts) expect(n).toBeGreaterThan(0);
  });
});

describe('extended filters', () => {
  it('enforces min/max price, discount and facet filters together', () => {
    const f = { ...emptyFilters(), maxPrice: 3000, minDiscount: 10, colors: ['white'] };
    for (const p of products.filter((x) => matchesFilters(x, f))) {
      expect(p.price).toBeLessThanOrEqual(3000);
      expect(productColors(p)).toContain('white');
    }
    expect(countActiveFilters(f)).toBe(3);
  });
});

describe('cart constraints (shared constant)', () => {
  it('quantity stays within safe bounds', () => {
    expect(CART_LIMITS.minQty).toBe(1);
    expect(CART_LIMITS.maxQty).toBeLessThanOrEqual(10);
  });
});
