import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Product } from '../types';
import { SmartVectorDB } from '../lib/vectorDb';
import { discountPct, formatPrice, formatStars } from '../lib/format';
import { LazyImage } from '../components/ui/primitives';
import { useCart } from '../store/cart';
import { useAppStore } from '../store/appStore';
import { useToast } from '../store/toast';
import { BADGE_LABELS } from '../types';
import { EmptyState } from '../components/ui/primitives';

export default function ProductPage({ vdb, products }: { vdb: SmartVectorDB; products: Product[] }) {
  const { id } = useParams();
  const product = products.find((p) => p.id === Number(id));
  const { addToCart, inCart } = useCart();
  const { inWishlist, toggleWish, inCompare, toggleCompare, pushRecent, recentIds } = useAppStore();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) pushRecent(product.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) {
    return (
      <div className="pd-wrap">
        <EmptyState
          icon="🤷"
          title="Product not found"
          message="This product doesn't exist in the catalog."
          action={<Link to="/catalog" className="btn-primary" style={{ display: 'inline-block' }}>Back to catalog</Link>}
        />
      </div>
    );
  }

  const p = product;
  const similar = vdb.similar(p.id, 6);
  const recent = recentIds
    .filter((rid) => rid !== p.id)
    .map((rid) => products.find((x) => x.id === rid))
    .filter(Boolean)
    .slice(0, 6) as Product[];

  return (
    <div className="pd-wrap">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link> › <Link to={`/catalog?category=${p.category}`}>{p.category}</Link> › <span>{p.name}</span>
      </nav>

      <div className="pd-grid">
        <div className="pd-img" aria-label="Product image, hover to zoom">
          <LazyImage src={p.image} alt={p.name} eager />
          {p.badge && BADGE_LABELS[p.badge] && <div className={`pc-badge ${p.badge}`}>{BADGE_LABELS[p.badge]}</div>}
        </div>

        <div className="pd-info">
          <div className="pd-brand">{p.brand} · {p.category}</div>
          <h1>{p.name}</h1>
          <div className="pc-stars">
            <span className="sv" aria-label={`Rated ${p.rating} out of 5`}>{formatStars(p.rating)} {p.rating}</span>
            <span className="rv">({p.reviews.toLocaleString('en-IN')} reviews)</span>
          </div>

          <div className="pd-price-row">
            <span className="pd-price">{formatPrice(p.price)}</span>
            <span className="pd-orig">{formatPrice(p.orig)}</span>
            <span className="pd-off">{discountPct(p.price, p.orig)}% off</span>
          </div>
          <div style={{ color: 'var(--green)', fontSize: 12, fontWeight: 600 }}>⚡ Free Delivery</div>

          <p className="pd-desc">{p.description}</p>

          <div className="pd-actions">
            <div className="qty-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }} role="group" aria-label="Quantity">
              <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
              <button className="qty-btn" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity">+</button>
            </div>
            <button
              className={inCart(p.id) ? 'atc added' : 'atc'}
              style={{ flex: 1, maxWidth: 220, padding: '13px' }}
              onClick={() => { if (!inCart(p.id)) { addToCart(p, qty); toast(`✅ ${qty} × ${p.name} added!`); } }}
            >
              {inCart(p.id) ? '✓ In Cart' : 'Add to Cart'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => { toggleWish(p.id); toast(inWishlist(p.id) ? 'Removed from wishlist' : '❤️ Added to wishlist!'); }}
              aria-pressed={inWishlist(p.id)}
            >
              {inWishlist(p.id) ? '❤️ Wishlisted' : '🤍 Wishlist'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => { toggleCompare(p.id); toast(inCompare(p.id) ? 'Removed from compare' : 'Added to compare ⚖️'); }}
              aria-pressed={inCompare(p.id)}
            >
              ⚖ {inCompare(p.id) ? 'In compare' : 'Compare'}
            </button>
          </div>

          <div className="pd-meta">
            <div className="pd-meta-cell"><div className="pd-meta-k">Brand</div><div className="pd-meta-v">{p.brand}</div></div>
            <div className="pd-meta-cell"><div className="pd-meta-k">Category</div><div className="pd-meta-v">{p.category}</div></div>
            <div className="pd-meta-cell"><div className="pd-meta-k">Rating</div><div className="pd-meta-v">{p.rating} ★</div></div>
            <div className="pd-meta-cell"><div className="pd-meta-k">Reviews</div><div className="pd-meta-v">{p.reviews.toLocaleString('en-IN')}</div></div>
          </div>

          <h2 className="sec-ttl" style={{ fontSize: 15 }}>Attributes</h2>
          <div>
            {(p.tags || []).map((t) => <span key={t} className="tag-pill">{t}</span>)}
          </div>

          {similar.length > 0 && (
            <>
              <h2 className="sec-ttl" style={{ fontSize: 15 }}>Similar products</h2>
              <p className="sec-sub">
                Found by the vector engine — {similar[0] ? `closest match shares ${Math.round(similar[0].score * 100)}% of this product's characteristics` : ''}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {similar.map((s) => (
                  <Link key={s.product.id} to={`/product/${s.product.id}`} className="sim-card" style={{ textDecoration: 'none' }}>
                    <div className="sim-card-img">
                      <LazyImage src={s.product.image} alt={s.product.name} />
                      <div className="sim-pct">{Math.round(s.score * 100)}%</div>
                    </div>
                    <div className="sim-card-body">
                      <div className="sim-card-name" style={{ minHeight: 0 }}>{s.product.name}</div>
                      <div className="sim-price" style={{ fontSize: 13 }}>{formatPrice(s.product.price)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {recent.length > 0 && (
            <>
              <h2 className="sec-ttl" style={{ fontSize: 15 }}>Recently viewed</h2>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {recent.map((r) => (
                  <Link key={r.id} to={`/product/${r.id}`} style={{ width: 72 }} aria-label={r.name}>
                    <LazyImage src={r.image} alt={r.name} className="brand-tag" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
