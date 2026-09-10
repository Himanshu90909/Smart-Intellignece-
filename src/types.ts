export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  orig: number;
  rating: number;
  reviews: number;
  image: string;
  tags: string[];
  badge: string | null;
  description: string;
  /** Derived, not stored: stock availability for the availability filter. */
  available?: boolean;
}

export type Badge = 'sale' | 'deal' | 'new' | 'trending' | 'ai';

export interface SearchHit {
  product: Product;
  score: number;
}

export interface Filters {
  categories: string[];
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  /** Minimum discount % (0–100). */
  minDiscount: number | null;
  availableOnly: boolean;
  /** Color facets detected from real product text. */
  colors: string[];
  /** Material facets detected from real product text. */
  materials: string[];
}

export type SortKey =
  | 'relevance'
  | 'price-asc'
  | 'price-desc'
  | 'rating-desc'
  | 'reviews-desc'
  | 'discount-desc';

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'Best match',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  'rating-desc': 'Highest rated',
  'reviews-desc': 'Most reviewed',
  'discount-desc': 'Biggest discount',
};

export const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🛍️' },
  { key: 'clothes', label: 'Clothes', icon: '👔' },
  { key: 'electronics', label: 'Electronics', icon: '📱' },
  { key: 'shoes', label: 'Shoes', icon: '👟' },
  { key: 'furniture', label: 'Furniture', icon: '🪑' },
  { key: 'beauty', label: 'Beauty', icon: '💄' },
  { key: 'books', label: 'Books', icon: '📚' },
  { key: 'sports', label: 'Sports', icon: '⚽' },
  { key: 'toys', label: 'Toys', icon: '🧸' },
  { key: 'grocery', label: 'Grocery', icon: '🥑' },
  { key: 'automotive', label: 'Automotive', icon: '🚗' },
  { key: 'deal', label: 'Deals', icon: '⚡' },
];

export const BADGE_LABELS: Record<string, string> = {
  sale: '% SALE',
  deal: '🔥 DEAL',
  new: '✦ NEW',
  trending: '🔵 TREND',
  ai: '🧠 AI PICK',
};
