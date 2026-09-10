import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { BADGE_LABELS } from '../../types';
import { discountPct, formatPrice, formatStars, highlightSegments } from '../../lib/format';
import { LazyImage } from '../ui/primitives';
import { useCart } from '../../store/cart';
import { QuickView } from './QuickView';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../store/toast';

/**
 * ProductCard — memoized so flipping cart/compare state elsewhere
 * doesn't re-render every card in a 300-product grid.
 */
export const ProductCard = memo(function ProductCard({ product, score = null, query = '' }: {
  product: Product; score?: number | null; query?: string;
}) {
  const { addToCart, inCart } = useCart();
  const { inWishlist, toggleWish, inCompare, toggleCompare } = useAppStore();
  const { toast } = useToast();

  const p = product;
  const d = discountPct(p.price, p.orig);
  const nameSegs = query ? highlightSegments(p.name, query) : [{ text: p.name, hit: false }];
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <article className={`pc${score && score > 0.1 ? ' ai-pick' : ''}`}>
      {p.badge && BADGE_LABELS[p.badge] && <div className={`pc-badge ${p.badge}`}>{BADGE_LABELS[p.badge]}</div>}
      <button
        className="pc-wish"
        onClick={() => {
          toggleWish(p.id);
          toast(inWishlist(p.id) ? 'Removed from wishlist' : '❤️ Added to wishlist!');
        }}
        aria-label={inWishlist(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
        aria-pressed={inWishlist(p.id)}
      >
        {inWishlist(p.id) ? '❤️' : '🤍'}
      </button>

      <button
        className="pc-quick"
        onClick={() => setQuickOpen(true)}
        aria-label={`Quick view ${p.name}`}
      >
        👁 Quick view
      </button>
      <Link to={`/product/${p.id}`} className="pc-img" aria-label={`View ${p.name}`}>
        <LazyImage src={p.image} alt={p.name} />
        {score !== null && score > 0.05 && (
          <div className="ai-score">🧠 {Math.min(99, Math.max(1, Math.round(score * 100 * 5)))}% match</div>
        )}
      </Link>

      <div className="pc-body">
        <div className="pc-brand">{p.brand}</div>
        <h3 className="pc-name" style={{ fontSize: 14, fontWeight: 600, minHeight: 38, lineHeight: '1.35', margin: '3px 0 6px' }}>
          <Link to={`/product/${p.id}`}>
            {nameSegs.map((s, i) =>
              s.hit ? <mark key={i} className="hl">{s.text}</mark> : <span key={i}>{s.text}</span>,
            )}
          </Link>
        </h3>
        <div className="pc-stars">
          <span className="sv" aria-label={`Rated ${p.rating} out of 5`}>{formatStars(p.rating)} {p.rating}</span>
          <span className="rv">({p.reviews.toLocaleString('en-IN')})</span>
        </div>
        <div className="pc-price">
          <span className="pp-main">{formatPrice(p.price)}</span>
          <span className="pp-orig">{formatPrice(p.orig)}</span>
          <span className="pp-off">{d}% off</span>
        </div>
        <div className="pc-del">⚡ Free Delivery</div>
        <div className="pc-actions">
          <button
            className={`atc${inCart(p.id) ? ' added' : ''}`}
            onClick={() => {
              if (!inCart(p.id)) {
                addToCart(p);
                toast(`✅ ${p.name.split(' ').slice(0, 3).join(' ')} added!`);
              }
            }}
            aria-label={inCart(p.id) ? `${p.name} already in cart` : `Add ${p.name} to cart`}
          >
            {inCart(p.id) ? '✓ Added' : 'Add to Cart'}
          </button>
          <button
            className={`cmp-btn${inCompare(p.id) ? ' act' : ''}`}
            onClick={() => {
              const wasIn = inCompare(p.id);
              toggleCompare(p.id);
              if (wasIn) toast('Removed from compare');
              else if (inCompare(p.id) || true) toast('Added to compare ⚖️');
            }}
            aria-label={inCompare(p.id) ? `Remove ${p.name} from comparison` : `Add ${p.name} to comparison`}
            aria-pressed={inCompare(p.id)}
            title="Compare"
          >
            ⚖
          </button>
        </div>
      </div>
          <QuickView product={p} open={quickOpen} onClose={() => setQuickOpen(false)} />
    </article>
  );
});
