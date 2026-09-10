import type { Product } from '../types';
import { discountPct } from './format';

/**
 * Recommendation reasons are computed from REAL product attributes —
 * every rail item explains itself with facts from the data, never fabricated.
 */
export interface Recommendation {
  product: Product;
  reason: string;
}

export function trending(products: Product[], topK = 8): Recommendation[] {
  return [...products]
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, topK)
    .map((p) => ({
      product: p,
      reason: `Trending — ${p.reviews.toLocaleString('en-IN')} shoppers reviewed this ${p.category} item`,
    }));
}

export function bestRated(products: Product[], minReviews = 100, topK = 8): Recommendation[] {
  return products
    .filter((p) => p.reviews >= minReviews && p.rating >= 4)
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    .slice(0, topK)
    .map((p) => ({
      product: p,
      reason: `Best rated — ${p.rating}★ from ${p.reviews.toLocaleString('en-IN')} reviews`,
    }));
}

export function bestValue(products: Product[], topK = 8): Recommendation[] {
  return [...products]
    .filter((p) => discountPct(p.price, p.orig) >= 50 && p.rating >= 3)
    .sort((a, b) => discountPct(b.price, b.orig) - discountPct(a.price, a.orig))
    .slice(0, topK)
    .map((p) => ({
      product: p,
      reason: `Best value — ${discountPct(p.price, p.orig)}% off and rated ${p.rating}★`,
    }));
}

/**
 * Personalised pick: score every product against the user's browsing behaviour
 * (recently viewed categories/brands/price band). If there is no history, the
 * score degrades to global popularity — and the reason says so honestly.
 */
export function personalized(
  products: Product[],
  recentlyViewed: Product[],
  topK = 8,
): Recommendation[] {
  if (recentlyViewed.length === 0) {
    return trending(products, topK).map((r) => ({
      ...r,
      reason: `Popular right now — you haven't viewed enough products yet to personalise this`,
    }));
  }

  const catScore = new Map<string, number>();
  const brandScore = new Map<string, number>();
  let avgPrice = 0;
  recentlyViewed.forEach((p, i) => {
    const w = 1 / (i + 1); // more recent = stronger signal
    catScore.set(p.category, (catScore.get(p.category) || 0) + w);
    brandScore.set(p.brand, (brandScore.get(p.brand) || 0) + w);
    avgPrice += p.price;
  });
  avgPrice /= recentlyViewed.length;

  const viewedIds = new Set(recentlyViewed.map((p) => p.id));
  const scored = products
    .filter((p) => !viewedIds.has(p.id))
    .map((p) => {
      const cat = catScore.get(p.category) || 0;
      const brand = brandScore.get(p.brand) || 0;
      const priceFit = 1 / (1 + Math.abs(p.price - avgPrice) / Math.max(avgPrice, 1));
      return { product: p, score: cat * 2 + brand + priceFit + p.rating / 10 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(({ product: p }) => {
    const bits: string[] = [];
    if (catScore.get(p.category)) bits.push(`matches the ${p.category} you browse`);
    if (brandScore.get(p.brand)) bits.push(`your preferred brand ${p.brand}`);
    if (Math.abs(p.price - avgPrice) < avgPrice * 0.4) bits.push(`fits your typical budget around ₹${Math.round(avgPrice)}`);
    if (!bits.length) bits.push(`rated ${p.rating}★ like the products you view`);
    return { product: p, reason: `Recommended because it ${bits.join(', ')}` };
  });
}

/** Recommendations shown inside the cart, based on actual cart contents. */
export function cartSuggestions(cart: Product[], all: Product[], topK = 4): Recommendation[] {
  if (!cart.length) return [];
  const cats = new Set(cart.map((p) => p.category));
  const cartIds = new Set(cart.map((p) => p.id));
  return all
    .filter((p) => !cartIds.has(p.id) && cats.has(p.category) && p.rating >= 3.5)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, topK)
    .map((p) => ({
      product: p,
      reason: `Goes well with your ${[...cats].slice(0, 2).join(' & ')} items · ${p.rating}★`,
    }));
}
