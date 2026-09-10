import { describe, expect, it } from 'vitest';
import { SmartVectorDB } from '../src/lib/vectorDb';
import { matchesFilters, applySorting, paginate, countActiveFilters, emptyFilters } from '../src/lib/filters';
import { discountPct, formatPrice, formatStars, highlightSegments } from '../src/lib/format';
import { trending, bestRated, personalized, cartSuggestions } from '../src/lib/recommend';
import { buildVerdicts, explainRecommendation } from '../src/lib/verdict';
import raw from '../src/data/products.json';
import type { Product } from '../src/types';

const products = raw as Product[];
const vdb = new SmartVectorDB(products);

describe('SmartVectorDB (TF-IDF + cosine)', () => {
  it('searches semantically — running shoes query returns shoes', () => {
    const hits = vdb.search('running shoes', 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.some((h) => /shoe|sneaker/i.test(h.product.name) || h.product.category === 'footwear'),
    ).toBe(true);
  });

  it('ranks better matches first', () => {
    const hits = vdb.search('wireless bluetooth earphones', 10);
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[hits.length - 1].score);
  });

  it('returns empty for gibberish with no token overlap', () => {
    expect(vdb.search('zzxxqqwyy', 5).length).toBe(0);
  });

  it('similar() excludes the product itself and stays deterministic', () => {
    const a = vdb.similar(1, 5);
    const b = vdb.similar(1, 5);
    expect(a.map((x) => x.product.id)).toEqual(b.map((x) => x.product.id));
    expect(a.every((x) => x.product.id !== 1)).toBe(true);
  });

  it('similarityBetween is symmetric and 0..1', () => {
    const ab = vdb.similarityBetween(1, 2);
    const ba = vdb.similarityBetween(2, 1);
    expect(ab).toBeCloseTo(ba, 10);
    expect(ab).toBeGreaterThanOrEqual(0);
    expect(ab).toBeLessThanOrEqual(1);
  });

  it('filters results through filterFn', () => {
    const hits = vdb.search('shoes', 100, (p) => p.price < 500);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.product.price < 500)).toBe(true);
  });
});

describe('filters', () => {
  const p = products[0];
  it('matches category filters', () => {
    const f = { ...emptyFilters(), categories: [p.category] };
    expect(matchesFilters(p, f)).toBe(true);
    expect(matchesFilters(p, { ...emptyFilters(), categories: ['nope'] })).toBe(false);
  });

  it('enforces maxPrice and minRating', () => {
    expect(matchesFilters(p, { ...emptyFilters(), maxPrice: p.price })).toBe(true);
    expect(matchesFilters(p, { ...emptyFilters(), maxPrice: p.price - 1 })).toBe(false);
    expect(matchesFilters(p, { ...emptyFilters(), minRating: p.rating })).toBe(true);
  });

  it('sorts correctly', () => {
    const sorted = applySorting(products, 'price-asc');
    expect(sorted[0].price).toBeLessThanOrEqual(sorted[1].price);
    const rated = applySorting(products, 'rating-desc');
    expect(rated[0].rating).toBeGreaterThanOrEqual(rated[1].rating);
  });

  it('paginates deterministically', () => {
    expect(paginate(products, 2, 10)).toHaveLength(10);
    expect(paginate(products, 1, 10)[0].id).toBe(products[0].id);
    expect(paginate(products, 999, 10)).toHaveLength(0);
  });

  it('counts active filters', () => {
    const f = { ...emptyFilters(), categories: ['a'], brands: ['b', 'c'], availableOnly: true };
    expect(countActiveFilters(f)).toBe(4);
    expect(countActiveFilters(emptyFilters())).toBe(0);
  });
});

describe('format helpers', () => {
  it('computes discount %', () => {
    expect(discountPct(80, 100)).toBe(20);
    expect(discountPct(100, 100)).toBe(0);
  });

  it('formats INR price (rounds, no decimals)', () => {
    expect(formatPrice(1234.56)).toBe('₹1,235');
    expect(formatPrice(999)).toBe('₹999');
  });

  it('renders 5-slot star glyphs with half-star marker', () => {
    expect(formatStars(4)).toBe('★★★★☆');
    expect(formatStars(4.5)).toBe('★★★★✩');
    expect(formatStars(5)).toBe('★★★★★');
  });

  it('highlights query segments', () => {
    const segs = highlightSegments('Nike Running Shoes', 'running');
    expect(segs.some((s) => s.hit && s.text.toLowerCase() === 'running')).toBe(true);
  });
});

describe('recommendations (attribute-based, honest reasons)', () => {
  it('trending = most reviewed with a reason string', () => {
    const recs = trending(products, 5);
    expect(recs).toHaveLength(5);
    expect(recs.every((r) => r.reason.length > 10)).toBe(true);
  });

  it('bestRated only returns >= 4★ with 100+ reviews', () => {
    for (const r of bestRated(products, 10)) {
      expect(r.product.rating).toBeGreaterThanOrEqual(4);
      expect(r.product.reviews).toBeGreaterThanOrEqual(100);
    }
  });

  it('personalized degrades honestly with no history', () => {
    const recs = personalized(products, [], 4);
    expect(recs[0].reason).toMatch(/haven't viewed enough/i);
  });

  it('personalized uses recency-weighted history', () => {
    const viewed = products.slice(0, 3);
    const recs = personalized(products, viewed, 8);
    const viewedIds = new Set(viewed.map((p) => p.id));
    expect(recs.every((r) => !viewedIds.has(r.product.id))).toBe(true);
  });

  it('cartSuggestions need a non-empty cart', () => {
    expect(cartSuggestions([], products, 4)).toHaveLength(0);
    const recs = cartSuggestions(products.slice(0, 2), products, 4);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.reason.length > 5)).toBe(true);
  });
});

describe('AI verdict engine', () => {
  const trio = [products[0], products[1], products[2]];
  it('produces a BEST OVERALL verdict for comparisons', () => {
    const v = buildVerdicts(trio);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0].title).toMatch(/BEST OVERALL/i);
    expect(v[0].rationale.length).toBeGreaterThan(20);
  });

  it('handles a single product without crashing', () => {
    expect(buildVerdicts([trio[0]]).length).toBe(0);
  });

  it('explains non-top picks with real similarity + rating + price facts', () => {
    const best = trio[0];
    const text = explainRecommendation(trio[1], best, (a, b) => vdb.similarityBetween(a, b));
    expect(text).toMatch(/% of its characteristics|top pick/i);
  });
});
