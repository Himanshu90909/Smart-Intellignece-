import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Product } from '../types';
import { SmartVectorDB } from '../lib/vectorDb';
import { buildVerdicts, explainRecommendation } from '../lib/verdict';
import { discountPct, formatPrice, formatStars } from '../lib/format';
import { EmptyState, LazyImage } from '../components/ui/primitives';
import { useAppStore } from '../store/appStore';

export default function ComparePage({ vdb, products }: { vdb: SmartVectorDB; products: Product[] }) {
  const [params] = useSearchParams();
  const { compareIds } = useAppStore();

  const ids = useMemo(() => {
    const fromUrl = (params.get('ids') || '').split(',').map(Number).filter(Boolean);
    return fromUrl.length ? fromUrl.slice(0, 4) : compareIds.slice(0, 4);
  }, [params, compareIds]);

  const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];

  if (items.length < 2) {
    return (
      <div className="pd-wrap">
        <EmptyState
          icon="⚖️"
          title="Add at least 2 products to compare"
          message="Use the ⚖ button on any product card to build a comparison."
          action={<Link to="/catalog" className="btn-primary" style={{ display: 'inline-block' }}>Browse catalog</Link>}
        />
      </div>
    );
  }

  const minPrice = Math.min(...items.map((p) => p.price));
  const maxRating = Math.max(...items.map((p) => p.rating));
  const maxDiscount = Math.max(...items.map((p) => discountPct(p.price, p.orig)));
  const verdicts = buildVerdicts(items);
  const bestId = verdicts[0]?.product.id;

  // Pairwise similarities for the matrix
  const pairs: { a: Product; b: Product; sim: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push({ a: items[i], b: items[j], sim: vdb.similarityBetween(items[i].id, items[j].id) });
    }
  }

  const rows: { label: string; render: (p: Product) => React.ReactNode }[] = [
    {
      label: 'Product',
      render: (p) => (
        <Link to={`/product/${p.id}`} style={{ display: 'block' }}>
          <LazyImage src={p.image} alt={p.name} eager style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</div>
          <div style={{ fontSize: 11, color: 'var(--dim)' }}>{p.brand}</div>
        </Link>
      ),
    },
    {
      label: 'Price',
      render: (p) => (
        <div className={p.price === minPrice ? 'cmp-winner' : ''} style={{ padding: 8, borderRadius: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: p.price === minPrice ? 'var(--green)' : 'var(--accent3)' }}>{formatPrice(p.price)}</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', textDecoration: 'line-through' }}>{formatPrice(p.orig)}</div>
          {p.price === minPrice && <div className="winner-tag">🏆 Best Price</div>}
        </div>
      ),
    },
    {
      label: 'Discount',
      render: (p) => {
        const d = discountPct(p.price, p.orig);
        return (
          <div className={d === maxDiscount ? 'cmp-winner' : ''} style={{ padding: 8, borderRadius: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: d === maxDiscount ? 'var(--green)' : 'var(--text)' }}>{d}%</span>
            {d === maxDiscount && <div className="winner-tag">🏆 Best Deal</div>}
          </div>
        );
      },
    },
    {
      label: 'Rating',
      render: (p) => (
        <div className={p.rating === maxRating ? 'cmp-winner' : ''} style={{ padding: 8, borderRadius: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)' }}>{p.rating} {formatStars(p.rating)}</div>
          <div style={{ fontSize: 11, color: 'var(--dim)' }}>({p.reviews.toLocaleString('en-IN')})</div>
          {p.rating === maxRating && <div className="winner-tag">🏆 Top Rated</div>}
        </div>
      ),
    },
    {
      label: 'Category',
      render: (p) => <span style={{ color: 'var(--accent2)', textTransform: 'capitalize' }}>{p.category}</span>,
    },
    {
      label: 'Attributes',
      render: (p) => (
        <div style={{ fontSize: 11 }}>
          {(p.tags || []).slice(0, 4).map((t) => <span key={t} className="tag-pill">{t}</span>)}
        </div>
      ),
    },
    {
      label: 'AI verdict',
      render: (p) => (
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'left', padding: 4 }}>
          {explainRecommendation(p, items.find((x) => x.id === bestId) || items[0], (a, b) => vdb.similarityBetween(a, b))}
        </div>
      ),
    },
  ];

  return (
    <div className="pd-wrap">
      <div className="breadcrumb"><Link to="/">Home</Link> › <span>Compare</span></div>
      <h1 className="sec-ttl" style={{ marginTop: 0 }}>⚖️ AI Product Comparison</h1>
      <p className="sec-sub" style={{ marginBottom: 20 }}>
        Verdicts computed from real attributes only — price, rating, review volume and vector similarity. No fabricated specs.
      </p>

      {/* AI VERDICTS */}
      <section aria-label="AI verdicts">
        <h2 className="sec-ttl" style={{ fontSize: 16 }}>🧠 AI Verdict</h2>
        <div className="verdict-grid">
          {verdicts.map((v) => (
            <div key={v.title} className="verdict-card">
              <div className="verdict-title">{v.title} — {v.product.name}</div>
              <div className="verdict-rat">{v.rationale}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <div className="cmp-table-wrap">
        <table className="cmp-table">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              {items.map((p) => <th key={p.id} scope="col">{p.name.split(' ').slice(0, 3).join(' ')}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" style={{ textAlign: 'left' }}>{row.label}</th>
                {items.map((p) => <td key={p.id}>{row.render(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SIMILARITY MATRIX */}
      <section aria-label="Vector similarity between compared products">
        <h2 className="sec-ttl" style={{ fontSize: 16 }}>🔗 How similar are they?</h2>
        <p className="sec-sub">Cosine similarity between the products' TF-IDF vectors</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {pairs.map(({ a, b, sim }) => (
            <div key={`${a.id}-${b.id}`} className="verdict-card" style={{ flex: '1 1 240px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{a.name.split(' ').slice(0, 2).join(' ')} ↔ {b.name.split(' ').slice(0, 2).join(' ')}</div>
              <div className="sim-bar"><div className="sim-bar-fill" style={{ width: `${Math.round(sim * 100)}%` }} /></div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{Math.round(sim * 100)}% characteristic overlap</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
