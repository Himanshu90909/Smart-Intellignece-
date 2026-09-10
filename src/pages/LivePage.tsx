import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAmazonDetails, searchAmazon } from '../lib/amazon';
import type { AmazonLiveDetails, AmazonLiveResult } from '../lib/amazon';
import { SkeletonCard, EmptyState, ErrorState, LazyImage } from '../components/ui/primitives';

/**
 * Live Amazon Data — powered by the Real-Time Amazon Data API through our
 * own backend proxy (key stays server-side). This is real, live data —
 * it complements the on-device catalog with current US Amazon listings.
 */
export default function LivePage() {
  const [mode, setMode] = useState<'search' | 'details'>('search');
  const [input, setInput] = useState('running shoes');
  const [country, setCountry] = useState('US');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AmazonLiveResult[]>([]);
  const [details, setDetails] = useState<AmazonLiveDetails | null>(null);
  const [searched, setSearched] = useState(false);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setDetails(null);
    setResults([]);
    try {
      if (mode === 'search') {
        setResults(await searchAmazon(q, country));
      } else {
        setDetails(await fetchAmazonDetails(q, country));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const switchMode = (m: 'search' | 'details') => {
    setMode(m);
    setResults([]);
    setDetails(null);
    setError(null);
    setSearched(false);
    setInput(m === 'search' ? 'running shoes' : 'B07ZPKBL9V');
  };

  return (
    <div className="pd-wrap">
      <div className="breadcrumb">
        <Link to="/">Home</Link> › <span>Live Amazon Data</span>
      </div>

      <div className="ai-box" style={{ marginBottom: 24 }}>
        <div className="ai-title">
          <span className="ai-icon" aria-hidden="true">📦</span>
          <h2>Live Amazon Data</h2>
          <span className="ai-badge">REAL API</span>
        </div>
        <p className="ai-sub">
          Real products straight from Amazon US via the Real-Time Amazon Data API — proxied through
          our own backend function so the API key never reaches your browser. The on-device catalog
          stays fully offline; this page is the live-data extension.
        </p>

        <div className="chips-row" role="tablist" aria-label="API mode">
          <button className={`chip${mode === 'search' ? ' act' : ''}`} role="tab" aria-selected={mode === 'search'} onClick={() => switchMode('search')}>
            🔍 Search products
          </button>
          <button className={`chip${mode === 'details' ? ' act' : ''}`} role="tab" aria-selected={mode === 'details'} onClick={() => switchMode('details')}>
            🏷️ Product details by ASIN
          </button>
        </div>

        <form className="ai-inp-row" onSubmit={run}>
          <input
            className="ai-inp"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'search' ? 'e.g. wireless earphones, yoga mat…' : 'e.g. B07ZPKBL9V'}
            aria-label={mode === 'search' ? 'Amazon search query' : 'Amazon ASIN'}
          />
          <select className="sort-select" value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
            {['US', 'IN', 'GB', 'DE', 'CA'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="ai-go-btn" type="submit" disabled={loading}>
            {loading ? 'Fetching…' : mode === 'search' ? 'Search Amazon →' : 'Fetch details →'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="pgrid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={run} />}

      {!loading && !error && searched && mode === 'search' && results.length === 0 && (
        <EmptyState icon="🔍" title="No live results" message={`Amazon returned no products for “${input}”. Try a different query.`} />
      )}

      {!loading && !error && results.length > 0 && (
        <>
          <div className="sec-ttl">Live from Amazon {country}</div>
          <div className="sec-sub">{results.length} real products · prices update in real time</div>
          <div className="pgrid">
            {results.map((r) => (
              <article key={r.asin} className="pc">
                <div className="pc-img">
                  {r.photo && <LazyImage src={r.photo} alt={r.title || 'Product'} />}
                  {r.isAmazonChoice && <div className="pc-badge new">AMAZON'S CHOICE</div>}
                    {!r.isAmazonChoice && r.isBestSeller && <div className="pc-badge deal">BEST SELLER</div>}
                </div>
                <div className="pc-body">
                  <div className="pc-brand">{r.asin}</div>
                  <h3 className="pc-name" style={{ minHeight: 54 }}>{r.title}</h3>
                  <div className="pc-price">
                    <span className="pp-main">{r.price || '—'}</span>
                    {r.originalPrice && <span className="pp-orig">{r.originalPrice}</span>}
                  </div>
                  <div className="pc-stars">
                    {r.rating && <span className="sv">★ {r.rating}</span>}
                    <span className="rv">({(r.numRatings || 0).toLocaleString('en-IN')})</span>
                    {r.isPrime && <span className="rv" style={{ color: 'var(--blue)' }}>Prime</span>}
                  </div>
                  {r.url && (
                    <a className="atc" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} href={r.url} target="_blank" rel="noreferrer">
                      View on Amazon ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!loading && !error && details && (
        <div className="pd-grid">
          <div className="pd-img">
            {details.photo && <LazyImage src={details.photo} alt={details.title || 'Product'} eager />}
          </div>
          <div className="pd-info">
            <div className="pd-brand">
              ASIN {details.asin}
              {details.isBestSeller && <span className="tag-pill" style={{ marginLeft: 8 }}>BEST SELLER</span>}
              {details.isAmazonChoice && <span className="tag-pill" style={{ marginLeft: 8 }}>AMAZON'S CHOICE</span>}
            </div>
            <h1>{details.title}</h1>
            <div className="pc-stars">
              <span className="sv">★ {details.rating}</span>
              <span className="rv">({(details.numRatings || 0).toLocaleString('en-IN')} ratings)</span>
            </div>
            <div className="pd-price-row">
              <span className="pd-price">{details.price || '—'}</span>
              {details.originalPrice && <span className="pd-orig">{details.originalPrice}</span>}
            </div>
            <p className="pd-desc">{details.description}</p>
            <div className="pd-meta">
              <div className="pd-meta-cell"><div className="pd-meta-k">Condition</div><div className="pd-meta-v">{details.condition || '—'}</div></div>
              <div className="pd-meta-cell"><div className="pd-meta-k">Availability</div><div className="pd-meta-v">{details.availability || '—'}</div></div>
              <div className="pd-meta-cell"><div className="pd-meta-k">Sales</div><div className="pd-meta-v">{details.salesVolume || '—'}</div></div>
              <div className="pd-meta-cell"><div className="pd-meta-k">Currency</div><div className="pd-meta-v">{details.currency || 'USD'}</div></div>
            </div>
            {details.aboutProduct && details.aboutProduct.length > 0 && (
              <>
                <h2 className="sec-ttl">About this item</h2>
                <ul style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                  {details.aboutProduct.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </>
            )}
            {details.specs && Object.keys(details.specs).length > 0 && (
              <>
                <h2 className="sec-ttl">Specifications</h2>
                <div className="pd-meta">
                  {Object.entries(details.specs).slice(0, 12).map(([k, v]) => (
                    <div className="pd-meta-cell" key={k}><div className="pd-meta-k">{k}</div><div className="pd-meta-v">{v}</div></div>
                  ))}
                </div>
              </>
            )}
            {details.url && (
              <a className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }} href={details.url} target="_blank" rel="noreferrer">
                View on Amazon ↗
              </a>
            )}
          </div>
        </div>
      )}

      {!loading && !searched && (
        <EmptyState
          icon="📦"
          title="Live Amazon data, one click away"
          message="Search real products or paste an ASIN above — results come straight from Amazon."
        />
      )}
    </div>
  );
}
