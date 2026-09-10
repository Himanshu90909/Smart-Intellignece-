import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../types';
import { SmartVectorDB } from '../lib/vectorDb';
import { formatPrice } from '../lib/format';
import { bestRated, bestValue, personalized, trending } from '../lib/recommend';
import { LazyImage } from '../components/ui/primitives';
import { useAppStore } from '../store/appStore';
import { useCart } from '../store/cart';

const AI_CHIPS = [
  'Best running shoes for fitness',
  'Wireless earphones for music',
  'Formal clothes office wear',
  'Anti-aging skincare beauty',
  'Kids educational toys',
  'Organic healthy grocery',
  'Car safety accessories',
  'Bedroom modern furniture',
];

/** Recommendation rail: every card carries its honest, attribute-based reason. */
function Rail({ title, subtitle, items, onAdd }: {
  title: string; subtitle?: string;
  items: { product: Product; reason: string }[];
  onAdd: (p: Product) => void;
}) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="sec-ttl">{title}</h2>
      {subtitle && <div className="sec-sub">{subtitle}</div>}
      <div className="rail">
        {items.map(({ product: p, reason }) => (
          <article key={p.id} className="pc">
            <Link to={`/product/${p.id}`} className="pc-img" aria-label={`View ${p.name}`}>
              <LazyImage src={p.image} alt={p.name} />
            </Link>
            <div className="pc-body">
              <div className="pc-brand">{p.brand}</div>
              <h3 className="pc-name" style={{ fontSize: 14, fontWeight: 600, minHeight: 38, margin: '3px 0 6px' }}>
                <Link to={`/product/${p.id}`} style={{ color: 'inherit' }}>{p.name}</Link>
              </h3>
              <div className="pc-price"><span className="pp-main">{formatPrice(p.price)}</span></div>
              <div className="rec-reason">{reason}</div>
              <button className="atc" style={{ marginTop: 6 }} onClick={() => onAdd(p)}>Add to Cart</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HomePage({ vdb, products }: { vdb: SmartVectorDB; products: Product[] }) {
  const navigate = useNavigate();
  const { recentIds } = useAppStore();
  const { addToCart } = useCart();

  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState<{ product: Product; score: number }[]>([]);

  const runAiSearch = (q: string) => {
    setAiQuery(q);
    setAiResults(vdb.search(q, 10));
  };

  const maxScore = aiResults.length ? Math.max(...aiResults.map((r) => r.score)) : 1;

  const recentProducts = useMemo(
    () => recentIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[],
    [recentIds, products],
  );

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-txt">
            <div className="eyebrow"><span className="eyebrow-dot"></span>PRODUCT DISCOVERY FRONTEND</div>
            <h1>Find the right product with <span className="hl">evidence</span></h1>
            <p>
              Smart Intelligence turns natural-language shopping intent into transparent filters,
              ranked catalog results, and explainable comparisons. Search is powered by a local
              TF-IDF vector index, so the core experience works without an external AI API.
            </p>
            <div className="hero-btns">
              <Link to="/catalog" className="btn-primary">Explore Catalog</Link>
              <Link to="/engineering" className="btn-ghost">View Engineering</Link>
            </div>
          </div>
          <div className="hero-stats">
            <div className="hstat"><div className="hstat-n">{products.length}</div><div className="hstat-l">Catalog products</div></div>
            <div className="hstat"><div className="hstat-n">{new Set(products.map((p) => p.category)).size}</div><div className="hstat-l">Categories</div></div>
            <div className="hstat"><div className="hstat-n">TF-IDF</div><div className="hstat-l">Vector DB</div></div>
            <div className="hstat"><div className="hstat-n">100%</div><div className="hstat-l">On-Device</div></div>
          </div>
        </div>
      </section>

      <section className="ai-panel" aria-labelledby="product-problem-title">
        <div className="ai-box" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>THE PRODUCT PROBLEM</div>
            <h2 id="product-problem-title" style={{ fontFamily: 'Outfit', fontSize: 22, marginBottom: 8 }}>Discovery should not require perfect keywords.</h2>
            <p className="ai-sub" style={{ marginBottom: 0 }}>Catalogs expose thousands of attributes, but shoppers usually describe intent in everyday language. Smart Intelligence keeps that translation visible instead of hiding it behind a black-box result.</p>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>THE FRONTEND SOLUTION</div>
            <p className="ai-sub" style={{ marginBottom: 0 }}>A URL-driven React interface connects search, filters, pagination, product detail, comparison, and cart state. Every important action has a loading, empty, error, or success state.</p>
          </div>
        </div>
      </section>

      {/* AI VECTOR SEARCH PANEL */}
      <section className="ai-panel" id="ai-panel" aria-label="AI vector search">
        <div className="ai-box">
          <div className="ai-title">
            <span className="ai-icon" aria-hidden="true">🧠</span>
            <h2>Smart Intelligence Search</h2>
            <span className="ai-badge">LOCAL AI</span>
          </div>
          <p className="ai-sub">
            On-device TF-IDF vector embeddings + cosine similarity — no external API. Finds
            perfect matches using semantic understanding.
          </p>
          <div className="ai-chips">
            {AI_CHIPS.map((c) => (
              <button key={c} className="ai-chip" onClick={() => runAiSearch(c)}>{c}</button>
            ))}
          </div>
          <form
            className="ai-inp-row"
            onSubmit={(e) => { e.preventDefault(); if (aiQuery.trim()) runAiSearch(aiQuery.trim()); }}
          >
            <input
              className="ai-inp"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Describe what you want — e.g. 'lightweight running shoes under budget', 'premium skincare glow'..."
              aria-label="Describe what you want"
            />
            <button className="ai-go-btn" type="submit">Find with AI →</button>
          </form>

          {aiResults.length > 0 && (
            <>
              <div className="sim-header" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <span className="ai-badge">VECTOR RESULTS</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Top {aiResults.length} semantic matches for "{aiQuery}"</span>
              </div>
              <div className="sim-grid">
                {aiResults.map(({ product: p, score }) => {
                  const pct = Math.round((score / maxScore) * 90) + 8;
                  return (
                    <div className="sim-card" key={p.id}>
                      <div className="sim-card-img">
                        <Link to={`/product/${p.id}`}><LazyImage src={p.image} alt={p.name} /></Link>
                        <div className="sim-pct">{pct}%</div>
                      </div>
                      <div className="sim-card-body">
                        <div className="sim-card-brand">{p.brand}</div>
                        <Link to={`/product/${p.id}`} className="sim-card-name" style={{ color: 'inherit', display: 'block' }}>{p.name}</Link>
                        <div className="sim-bar"><div className="sim-bar-fill" style={{ width: `${pct}%` }} /></div>
                        <div className="sim-price">{formatPrice(p.price)}</div>
                        <button className="sim-atc" onClick={() => addToCart(p)}>Add to Cart</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate(`/search?q=${encodeURIComponent(aiQuery)}`)}>
                See all results in catalog →
              </button>
            </>
          )}
        </div>
      </section>

      {/* DISCOVERY RAILS */}
      <div style={{ maxWidth: 1800, margin: '0 auto', padding: '0 20px' }}>
        <Rail
          title="✨ Recommended for you"
          subtitle="Personalised from your browsing behaviour — with honest reasons"
          items={personalized(products, recentProducts, 8)}
          onAdd={addToCart}
        />
        <Rail title="🔥 Trending now" subtitle="Most reviewed across the catalog" items={trending(products, 8)} onAdd={addToCart} />
        <Rail title="⭐ Best rated" subtitle="4★ and above, weighed by review volume" items={bestRated(products, 8)} onAdd={addToCart} />
        <Rail title="💰 Best value" subtitle="Biggest discounts on well-rated products" items={bestValue(products, 8)} onAdd={addToCart} />
        {recentProducts.length > 0 && (
          <Rail title="👀 Recently viewed" subtitle="Continue where you left off" items={recentProducts.map((p) => ({ product: p, reason: `You viewed this ${p.category} item recently` }))} onAdd={addToCart} />
        )}
        <section className="ai-box" aria-labelledby="architecture-title" style={{ margin: '8px 0 30px' }}>
          <div className="ai-title"><span className="ai-icon" aria-hidden="true">⚙</span><h2 id="architecture-title">How the frontend is engineered</h2></div>
          <p className="ai-sub">React components render the interaction, Context stores only genuinely shared client state, domain modules rank and filter real catalog data, and the API client isolates optional live data. Visit the Engineering page for browser measurements and implementation tradeoffs.</p>
          <Link to="/engineering" className="btn-ghost">Open engineering notes →</Link>
        </section>
      </div>
    </>
  );
}
