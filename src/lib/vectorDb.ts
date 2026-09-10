import type { Product, SearchHit } from '../types';

/**
 * SmartVectorDB — the original on-device search engine of Smart Intelligence,
 * ported 1:1 from the vanilla-JS app and typed.
 *
 * TF-IDF embeddings + cosine similarity, zero external API calls.
 * Kept deliberately: it is real, explainable "AI" and it runs in the browser.
 */
export class SmartVectorDB {
  private readonly products: Product[];
  private readonly docVecs: Map<number, Map<string, number>> = new Map();
  private readonly idf: Map<string, number> = new Map();
  private static readonly STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'for', 'in', 'to', 'of', 'with', 'is',
    'are', 'was', 'be', 'by', 'on', 'at', 'from', 'it', 'its', 'this',
    'that', 'high', 'quality', 'item', 'number', 'product',
  ]);

  constructor(products: Product[]) {
    this.products = products;
    this.build();
  }

  static tokenize(text: string): string[] {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !SmartVectorDB.STOPWORDS.has(t));
  }

  /** Document text with price/rating enrichment — same weighting as the original. */
  private static docText(p: Product): string {
    const priceTag =
      p.price < 500 ? 'budget affordable cheap'
      : p.price < 1500 ? 'mid-range value'
      : p.price < 4000 ? 'premium quality'
      : 'luxury high-end expensive';
    const ratingTag =
      p.rating >= 4.5 ? 'excellent top-rated bestseller'
      : p.rating >= 4 ? 'good recommended'
      : 'decent average';
    return [
      p.name, p.name, // name weighted 2x
      p.brand, p.category, p.category,
      ...(p.tags || []),
      priceTag, ratingTag,
      p.description || '',
    ].join(' ');
  }

  private build(): void {
    const docs = this.products.map((p) => SmartVectorDB.tokenize(SmartVectorDB.docText(p)));
    const N = docs.length;
    const df = new Map<string, number>();
    for (const doc of docs) {
      for (const t of new Set(doc)) df.set(t, (df.get(t) || 0) + 1);
    }
    for (const [t, freq] of df) {
      this.idf.set(t, Math.log((N + 1) / (freq + 1)) + 1);
    }
    for (let i = 0; i < N; i++) {
      this.docVecs.set(this.products[i].id, this.tfidf(docs[i]));
    }
  }

  private tfidf(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const len = tokens.length || 1;
    const vec = new Map<string, number>();
    for (const [t, count] of tf) {
      vec.set(t, (count / len) * (this.idf.get(t) || 1));
    }
    return vec;
  }

  private queryVec(text: string): Map<string, number> {
    const tokens = SmartVectorDB.tokenize(text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const len = tokens.length || 1;
    const vec = new Map<string, number>();
    for (const [t, count] of tf) {
      vec.set(t, (count / len) * (this.idf.get(t) || 0.3));
    }
    return vec;
  }

  static cosine(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0, na = 0, nb = 0;
    const [small, big] = a.size <= b.size ? [a, b] : [b, a];
    for (const [k, av] of small) {
      const bv = big.get(k);
      if (bv !== undefined) dot += av * bv;
    }
    for (const v of a.values()) na += v * v;
    for (const v of b.values()) nb += v * v;
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  search(query: string, topK = 30, filterFn?: (p: Product) => boolean): SearchHit[] {
    const qv = this.queryVec(query);
    if (qv.size === 0) return [];
    const scored: SearchHit[] = [];
    for (let i = 0; i < this.products.length; i++) {
      const p = this.products[i];
      if (filterFn && !filterFn(p)) continue;
      const score = SmartVectorDB.cosine(qv, this.docVecs.get(p.id)!);
      if (score > 0) scored.push({ product: p, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /** Raw pairwise cosine similarity between two products' document vectors. */
  similarityBetween(a: number, b: number): number {
    const va = this.docVecs.get(a);
    const vb = this.docVecs.get(b);
    if (!va || !vb) return 0;
    return SmartVectorDB.cosine(va, vb);
  }

  /** Products most similar to the given one (used by "Similar Products"). */
  similar(id: number, topK = 6): SearchHit[] {
    const base = this.docVecs.get(id);
    if (!base) return [];
    const scored: SearchHit[] = [];
    for (const p of this.products) {
      if (p.id === id) continue;
      scored.push({ product: p, score: SmartVectorDB.cosine(base, this.docVecs.get(p.id)!) });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * Explain a match in plain words — the matched terms between query and product.
   * Powers the "Why this recommendation?" text with real evidence.
   */
  explain(id: number, query: string): string[] {
    const base = this.docVecs.get(id);
    if (!base) return [];
    const qTokens = new Set(SmartVectorDB.tokenize(query));
    const shared: string[] = [];
    for (const t of base.keys()) {
      if (qTokens.has(t)) shared.push(t);
    }
    return shared;
  }
}
