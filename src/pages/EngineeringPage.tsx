import { useState } from 'react';
import { products } from '../data/products';
import { SmartVectorDB } from '../lib/vectorDb';
import { matchesFilters } from '../lib/filters';
import { getVectorBuildMs, measure, readBundle, readNavigation, readWebVitals } from '../lib/metrics';

/**
 * /engineering — Frontend Engineering Metrics dashboard.
 * Every value on this page is measured LIVE in this browser session:
 * vector build time, search latency, filter throughput, Web Vitals and the
 * actual bytes the browser downloaded. Nothing is fabricated.
 */
export default function EngineeringPage() {
  const [query, setQuery] = useState('running shoes');
  const { result: hits, ms: searchMs } = measure('search', () => new SmartVectorDB(products).search(query, 50));
  const { ms: filterMs } = measure('filter', () =>
    products.filter((p) => matchesFilters(p, { categories: [], brands: [], minPrice: null, maxPrice: 3000, minRating: 4, minDiscount: null, availableOnly: false, colors: [], materials: [] })));
  const { ms: buildMs } = measure('build-vectors', () => new SmartVectorDB(products));

  const vitals = readWebVitals();
  const nav = readNavigation();
  const bundle = readBundle().sort((a, b) => b.transferKB - a.transferKB);
  const totalKB = Math.round(bundle.reduce((a, b) => a + b.transferKB, 0));

  const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(2));

  return (
    <div className="pd-wrap">
      <div className="breadcrumb"><a href="/">Home</a> › <span>Engineering</span></div>
      <h1 className="sec-ttl">⚙️ Frontend Engineering Metrics</h1>
      <p className="sec-sub" style={{ marginBottom: 20 }}>
        Live measurements from <strong>this browser session</strong> — search latency, filter throughput,
        Web Vitals and actual downloaded bundle sizes. Re-measured on every visit; nothing is hardcoded.
      </p>

      <h2 className="sec-ttl" style={{ fontSize: 16 }}>Data & engine</h2>
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-k">Products loaded</div>
          <div className="metric-v">{products.length}</div>
          <div className="metric-n">static catalog, embedded in the app</div>
        </div>
        <div className="metric-card">
          <div className="metric-k">Vector index build</div>
          <div className="metric-v">{buildMs.toFixed(1)}<span style={{ fontSize: 13 }}> ms</span></div>
          <div className="metric-n">
            TF-IDF over all {products.length} docs{getVectorBuildMs() !== null ? ` (app boot: ${getVectorBuildMs()?.toFixed(1)} ms)` : ''}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-k">Search response time</div>
          <div className="metric-v">{searchMs.toFixed(2)}<span style={{ fontSize: 13 }}> ms</span></div>
          <div className="metric-n">top {hits.length} hits for “{query}”</div>
          <input
            className="range-inp"
            style={{ marginTop: 8 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Query to re-measure search latency"
          />
        </div>
        <div className="metric-card">
          <div className="metric-k">Filter processing</div>
          <div className="metric-v">{filterMs.toFixed(2)}<span style={{ fontSize: 13 }}> ms</span></div>
          <div className="metric-n">price + rating over {products.length} products</div>
        </div>
      </div>

      <h2 className="sec-ttl" style={{ fontSize: 16 }}>Web Vitals (this session)</h2>
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-k">LCP</div>
          <div className="metric-v">{fmt(vitals.lcpMs)}<span style={{ fontSize: 13 }}> ms</span></div>
          <div className="metric-n">largest contentful paint (so far)</div>
        </div>
        <div className="metric-card">
          <div className="metric-k">CLS</div>
          <div className="metric-v">{fmt(vitals.cls)}</div>
          <div className="metric-n">cumulative layout shift</div>
        </div>
        <div className="metric-card">
          <div className="metric-k">Long tasks</div>
          <div className="metric-v">{Math.round(vitals.longTaskMs)}<span style={{ fontSize: 13 }}> ms</span></div>
          <div className="metric-n">total blocking proxy (50ms+ tasks)</div>
        </div>
        <div className="metric-card">
          <div className="metric-k">DOM loaded / Load</div>
          <div className="metric-v" style={{ fontSize: 18 }}>{nav.domContentLoadedMs ?? '—'} / {nav.loadMs ?? '—'} ms</div>
          <div className="metric-n">navigation timing</div>
        </div>
      </div>

      <h2 className="sec-ttl" style={{ fontSize: 16 }}>Bundle — actual bytes downloaded ({totalKB} KB total)</h2>
      <div className="metric-card" style={{ padding: 0 }}>
        {bundle.map((b) => (
          <div className="bundle-row" key={b.name}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
            <span>{b.type.toUpperCase()} · {b.transferKB} KB{b.decodedKB && b.decodedKB !== b.transferKB ? ` (${b.decodedKB} decoded)` : ''}</span>
          </div>
        ))}
      </div>
      <p className="sec-sub" style={{ marginTop: 12 }}>
        Route-level code splitting keeps the initial JS small — Catalog / Product / Compare / Live
        chunks load on demand. Gzip figures appear once the CDN serves compressed assets.
      </p>
    </div>
  );
}
