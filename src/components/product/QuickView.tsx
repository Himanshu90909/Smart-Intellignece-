import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { discountPct, formatPrice, formatStars } from '../../lib/format';
import { LazyImage } from '../ui/primitives';
import { Modal } from '../ui/Modal';
import { useCart } from '../../store/cart';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../store/toast';

/**
 * QuickView — accessible modal preview of a product without leaving the grid.
 * All data comes from the existing product record; nothing is fabricated.
 */
export function QuickView({ product, open, onClose }: {
  product: Product | null; open: boolean; onClose: () => void;
}) {
  const { addToCart, inCart } = useCart();
  const { inWishlist, toggleWish, inCompare, toggleCompare } = useAppStore();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  if (!product) return null;
  const p = product;

  return (
    <Modal open={open} onClose={onClose} title={`Quick view: ${p.name}`}>
      <div className="qv-grid">
        <div className="qv-img">
          <LazyImage src={p.image} alt={p.name} eager />
        </div>
        <div className="qv-info">
          <div className="pd-brand">{p.brand} · {p.category}</div>
          <h3 style={{ fontSize: 16, margin: '4px 0 8px' }}>{p.name}</h3>
          <div className="pc-stars">
            <span className="sv">{formatStars(p.rating)} {p.rating}</span>
            <span className="rv">({p.reviews.toLocaleString('en-IN')})</span>
          </div>
          <div className="pd-price-row">
            <span className="pd-price">{formatPrice(p.price)}</span>
            <span className="pd-orig">{formatPrice(p.orig)}</span>
            <span className="pd-off">{discountPct(p.price, p.orig)}% off</span>
          </div>
          <p className="pd-desc" style={{ fontSize: 12 }}>{p.description}</p>
          <div style={{ margin: '10px 0' }}>
            {(p.tags || []).slice(0, 6).map((t) => <span key={t} className="tag-pill">{t}</span>)}
          </div>
          <div className="pd-actions">
            <div className="qty-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }} role="group" aria-label="Quantity">
              <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
              <span aria-live="polite" style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
              <button className="qty-btn" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity">+</button>
            </div>
            <button
              className="atc"
              disabled={inCart(p.id)}
              onClick={() => { addToCart(p, qty); toast(`✅ ${qty} × ${p.name} added!`); }}
            >
              {inCart(p.id) ? '✓ In Cart' : 'Add to Cart'}
            </button>
          </div>
          <div className="pd-actions" style={{ marginTop: 8 }}>
            <button className="btn-ghost" aria-pressed={inWishlist(p.id)}
              onClick={() => { toggleWish(p.id); toast(inWishlist(p.id) ? 'Removed from wishlist' : '❤️ Added to wishlist!'); }}>
              {inWishlist(p.id) ? '❤️ Wishlisted' : '🤍 Wishlist'}
            </button>
            <button className="btn-ghost" aria-pressed={inCompare(p.id)}
              onClick={() => { toggleCompare(p.id); toast(inCompare(p.id) ? 'Removed from compare' : 'Added to compare ⚖️'); }}>
              ⚖ {inCompare(p.id) ? 'In compare' : 'Compare'}
            </button>
            <Link className="btn-ghost" to={`/product/${p.id}`} onClick={onClose}>Full details →</Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
