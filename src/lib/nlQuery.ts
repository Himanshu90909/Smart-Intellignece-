import type { Filters, Product } from '../types';
import { emptyFilters } from './filters';
import { COLOR_WORDS, MATERIAL_WORDS } from './facets';

/**
 * Natural-language query interpretation ("Ask Smart Intelligence").
 *
 * Parses a user request like "Show me white running shoes under ₹3000"
 * into real, inspectable filters — categories, brands, colors, materials,
 * price bounds and rating thresholds. It NEVER invents products: the parsed
 * filters are intersected with the catalog; results always come from the
 * dataset / vector index.
 */

export interface NLInterpretation {
  /** Residual keywords fed to the vector search (minus parsed constraints). */
  query: string;
  filters: Filters;
  /** Human-readable chips: [{ label: 'Color', value: 'white' }] */
  chips: { label: string; value: string }[];
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  shoes: ['shoe', 'shoes', 'footwear', 'sneaker', 'sneakers', 'running', 'trainers'],
  clothes: ['shirt', 'tshirt', 't-shirt', 'dress', 'jeans', 'clothing', 'outfit', 'wear', 'fashion', 'hoodie'],
  electronics: ['phone', 'smartphone', 'laptop', 'headphone', 'headphones', 'earphone', 'earphones', 'earbuds', 'electronics', 'gadget', 'camera', 'speaker', 'charger', 'watch', 'tablet'],
  furniture: ['chair', 'sofa', 'table', 'bed', 'furniture', 'desk', 'mattress', 'cabinet'],
  beauty: ['skincare', 'beauty', 'cream', 'serum', 'makeup', 'shampoo', 'cosmetic', 'cosmetics'],
  books: ['book', 'books', 'novel', 'reading', 'guide'],
  sports: ['gym', 'fitness', 'yoga', 'sport', 'sports', 'exercise', 'dumbbell', 'cricket', 'football'],
  toys: ['toy', 'toys', 'kids', 'puzzle', 'lego', 'board game', 'educational game'],
  grocery: ['food', 'snack', 'coffee', 'tea', 'organic', 'grocery', 'protein'],
  automotive: ['car', 'cars', 'bike', 'automotive', 'helmet', 'tyre', 'accessories for car'],
};

function parseNumber(raw: string): number {
  return Number(raw.replace(/[,\s]/g, ''));
}

export function parseNL(input: string, catalog: Product[]): NLInterpretation {
  let text = ` ${input.toLowerCase()} `;
  const filters = emptyFilters();
  const chips: { label: string; value: string }[] = [];

  // ---- Category ----
  outer: for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const w of words) {
      if (text.includes(` ${w}`) || text.includes(`${w} `)) {
        filters.categories = [cat];
        chips.push({ label: 'Category', value: cat });
        break outer;
      }
    }
  }

  // ---- Brand (only brands that exist in the dataset) ----
  const knownBrands = [...new Set(catalog.map((p) => p.brand))];
  for (const b of knownBrands) {
    if (b.length > 2 && text.includes(` ${b.toLowerCase()} `)) {
      filters.brands = [b];
      chips.push({ label: 'Brand', value: b });
      break;
    }
  }

  // ---- Colors ----
  const colors = COLOR_WORDS.filter((c) => text.includes(` ${c} `));
  if (colors.length) {
    filters.colors = colors as unknown as string[];
    colors.forEach((c) => chips.push({ label: 'Color', value: c }));
  }

  // ---- Materials ----
  const materials = MATERIAL_WORDS.filter((m) => text.includes(` ${m} `));
  if (materials.length) {
    filters.materials = materials as unknown as string[];
    materials.forEach((m) => chips.push({ label: 'Material', value: m }));
  }

  // ---- Price range: "between 2000 and 5000", "under/below/less than X", "over/above X" ----
  const between = text.match(/(?:between|from)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\s*(?:and|to|-)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/);
  if (between) {
    filters.minPrice = parseNumber(between[1]);
    filters.maxPrice = parseNumber(between[2]);
    chips.push({ label: 'Price', value: `₹${between[1]}–₹${between[2]}` });
  } else {
    const under = text.match(/(?:under|below|less than|upto|up to|cheaper than|max(?:imum)?|<)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/);
    if (under) {
      filters.maxPrice = parseNumber(under[1]);
      chips.push({ label: 'Maximum Price', value: `₹${parseNumber(under[1]).toLocaleString('en-IN')}` });
    }
    const over = text.match(/(?:over|above|more than|min(?:imum)?|>)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/);
    if (over && filters.minPrice === null) {
      filters.minPrice = parseNumber(over[1]);
      chips.push({ label: 'Minimum Price', value: `₹${parseNumber(over[1]).toLocaleString('en-IN')}` });
    }
  }

  // ---- Rating: "4+ rating", "4 star and above", "highly rated", "best" ----
  const rating = text.match(/([1-5](?:\.\d)?)\s*\+?\s*(?:star|rating|★)/);
  if (rating) {
    filters.minRating = Number(rating[1]);
    chips.push({ label: 'Minimum Rating', value: `${rating[1]}★` });
  } else if (/(highly rated|top rated|best rated|top-rated|highest rated)/.test(text)) {
    filters.minRating = 4.0;
    chips.push({ label: 'Minimum Rating', value: '4★ (highly rated)' });
  }

  // ---- Discount: "discount", "on sale", "deal" ----
  if (/(discount|on sale|deal|deals|offer)/.test(text)) {
    filters.minDiscount = 10;
    chips.push({ label: 'Minimum Discount', value: '10%+' });
  }

  // ---- Availability ----
  if (/(in stock|available|availability)/.test(text)) {
    filters.availableOnly = true;
    chips.push({ label: 'Availability', value: 'In stock' });
  }

  // ---- Residual query: strip constraint phrases, keep topical keywords ----
  let residual = input;
  const strip = [
    /(?:under|below|less than|upto|up to|cheaper than|max(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi,
    /(?:over|above|more than|min(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi,
    /(?:between|from)\s*(?:₹|rs\.?|inr)?\s*[\d,]+\s*(?:and|to|-)\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi,
    /[1-5](?:\.\d)?\s*\+?\s*(?:star|rating|★)/gi,
    /\b(show|find|me|get|want|need|please|the|a|an|for|with|and|of|my)\b/gi,
    /(highly rated|top rated|best rated|top-rated|highest rated|in stock|available|availability|discount|on sale|deal|deals|offer)/gi,
  ];
  for (const re of strip) residual = residual.replace(re, ' ');
  residual = residual.replace(/[₹,]|\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim();

  return { query: residual, filters, chips };
}

/**
 * Graceful degradation: try the full filter set; if facet filters
 * (colors/materials) match nothing in the catalog, relax them and let the
 * vector search rank by the same terms instead of showing an empty grid.
 * Returns whether facets were relaxed so the UI can say so honestly.
 */
export function applyWithFallback<T>(
  attempt: (filters: Filters) => T[],
  filters: Filters,
): { results: T[]; relaxed: boolean } {
  const full = attempt(filters);
  if (full.length > 0) return { results: full, relaxed: false };
  const relaxedFilters: Filters = { ...filters, colors: [], materials: [] };
  const relaxed = attempt(relaxedFilters);
  return { results: relaxed, relaxed: relaxed.length > 0 };
}
