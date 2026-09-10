import type { Product } from '../types';
import { discountPct, formatPrice } from './format';

/**
 * AI Verdict for the comparison page — computed ONLY from real attributes
 * (price, rating, reviews, discount, similarity). No fabricated specs.
 */
export interface Verdict {
  product: Product;
  title: string;
  rationale: string;
}

export function buildVerdicts(products: Product[]): Verdict[] {
  if (products.length === 0) return [];
  const bestPrice = Math.min(...products.map((p) => p.price));
  const bestRating = Math.max(...products.map((p) => p.rating));
  const bestDiscount = Math.max(...products.map((p) => discountPct(p.price, p.orig)));
  const bestReviews = Math.max(...products.map((p) => p.reviews));

  // "Best overall" = normalized score across rating, price value and popularity
  const score = (p: Product) =>
    (p.rating / 5) * 0.45 +
    (1 - p.price / Math.max(...products.map((x) => x.price))) * 0.3 +
    (p.reviews / bestReviews) * 0.25;
  const overall = [...products].sort((a, b) => score(b) - score(a))[0];

  const verdicts: Verdict[] = [];

  if (products.length >= 2) {
    verdicts.push({
      product: overall,
      title: '🏆 BEST OVERALL',
      rationale: `Highest combined score: ${overall.rating}★ rating, ${formatPrice(overall.price)} price and ${overall.reviews.toLocaleString('en-IN')} reviews — best balance of quality, value and popularity in this comparison.`,
    });
  }

  const cheapest = products.find((p) => p.price === bestPrice)!;
  if (cheapest.id !== overall.id) {
    verdicts.push({
      product: cheapest,
      title: '💰 BEST FOR BUDGET',
      rationale: `Lowest price at ${formatPrice(cheapest.price)} (${discountPct(cheapest.price, cheapest.orig)}% off) — cheapest entry point in this comparison.`,
    });
  }

  const topRated = products.find((p) => p.rating === bestRating)!;
  if (topRated.id !== overall.id) {
    verdicts.push({
      product: topRated,
      title: '⭐ BEST RATED',
      rationale: `Top rating of ${topRated.rating}★ from ${topRated.reviews.toLocaleString('en-IN')} reviews — shoppers rate it highest in this comparison.`,
    });
  }

  const bestDeal = products.find((p) => discountPct(p.price, p.orig) === bestDiscount)!;
  if (bestDeal.id !== overall.id && bestDeal.id !== cheapest.id) {
    verdicts.push({
      product: bestDeal,
      title: '⚡ BEST DEAL',
      rationale: `Biggest discount at ${bestDiscount}% off — drops from ${formatPrice(bestDeal.orig)} to ${formatPrice(bestDeal.price)}.`,
    });
  }

  return verdicts;
}

/**
 * "Why is this recommended?" for a single product inside a comparison —
 * states how similar it is to the best pick using the vector engine.
 */
export function explainRecommendation(product: Product, best: Product, similarity: (a: number, b: number) => number): string {
  if (product.id === best.id) {
    return 'This is our top pick in this comparison based on rating, price and review volume.';
  }
  const sim = Math.round(similarity(product.id, best.id) * 100);
  return `Shares about ${sim}% of its characteristics with our top pick (same style of features according to the vector engine), but differs on rating (${product.rating}★ vs ${best.rating}★) and price (${formatPrice(product.price)} vs ${formatPrice(best.price)}).`;
}
