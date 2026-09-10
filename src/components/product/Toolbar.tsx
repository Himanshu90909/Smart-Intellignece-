import type { Filters, SortKey } from '../../types';
import { SORT_LABELS } from '../../types';

/** Active-filter chips row with per-chip clear. */
export function ActiveFilterChips({ filters, onChange }: {
  filters: Filters; onChange: (f: Filters) => void;
}) {
  const chips: { label: string; clear: () => void }[] = [];
  filters.categories.forEach((c) =>
    chips.push({ label: `Category: ${c}`, clear: () => onChange({ ...filters, categories: filters.categories.filter((x) => x !== c) }) }));
  filters.brands.forEach((b) =>
    chips.push({ label: `Brand: ${b}`, clear: () => onChange({ ...filters, brands: filters.brands.filter((x) => x !== b) }) }));
  if (filters.minPrice !== null)
    chips.push({ label: `From ₹${filters.minPrice.toLocaleString('en-IN')}`, clear: () => onChange({ ...filters, minPrice: null }) });
  if (filters.maxPrice !== null)
    chips.push({ label: `Up to ₹${filters.maxPrice.toLocaleString('en-IN')}`, clear: () => onChange({ ...filters, maxPrice: null }) });
  if (filters.minRating !== null)
    chips.push({ label: `★${filters.minRating} & up`, clear: () => onChange({ ...filters, minRating: null }) });
  if (filters.minDiscount !== null)
    chips.push({ label: `${filters.minDiscount}%+ off`, clear: () => onChange({ ...filters, minDiscount: null }) });
  filters.colors.forEach((c) =>
    chips.push({ label: `Color: ${c}`, clear: () => onChange({ ...filters, colors: filters.colors.filter((x) => x !== c) }) }));
  filters.materials.forEach((m) =>
    chips.push({ label: `Material: ${m}`, clear: () => onChange({ ...filters, materials: filters.materials.filter((x) => x !== m) }) }));
  if (filters.availableOnly)
    chips.push({ label: 'In stock', clear: () => onChange({ ...filters, availableOnly: false }) });

  if (!chips.length) return null;
  return (
    <div className="chips-row" role="group" aria-label="Active filters">
      {chips.map((c, i) => (
        <span key={i} className="active-chip">
          {c.label}
          <button onClick={c.clear} aria-label={`Remove filter ${c.label}`}>✕</button>
        </span>
      ))}
    </div>
  );
}

export function SortDropdown({ sort, onChange }: { sort: SortKey; onChange: (s: SortKey) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <label htmlFor="sort" style={{ fontSize: 12, color: 'var(--dim)' }}>Sort by</label>
      <select
        id="sort"
        className="sort-select"
        value={sort}
        onChange={(e) => onChange(e.target.value as SortKey)}
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
          <option key={k} value={k}>{SORT_LABELS[k]}</option>
        ))}
      </select>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const visible = 2;
  const pages: number[] = [];
  for (let i = Math.max(1, page - visible); i <= Math.min(totalPages, page + visible); i++) pages.push(i);

  const go = (p: number) => {
    onChange(p);
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="page-btn" disabled={page === 1} onClick={() => go(page - 1)} aria-label="Previous page">‹</button>
      {!pages.includes(1) && <button className="page-btn" onClick={() => go(1)}>1</button>}
      {!pages.includes(1) && pages[0] > 2 && <span style={{ color: 'var(--dim)' }}>…</span>}
      {pages.map((p) => (
        <button key={p} className={`page-btn${p === page ? ' act' : ''}`} onClick={() => go(p)} aria-current={p === page ? 'page' : undefined}>
          {p}
        </button>
      ))}
      {!pages.includes(totalPages) && pages[pages.length - 1] < totalPages - 1 && <span style={{ color: 'var(--dim)' }}>…</span>}
      {!pages.includes(totalPages) && <button className="page-btn" onClick={() => go(totalPages)}>{totalPages}</button>}
      <button className="page-btn" disabled={page === totalPages} onClick={() => go(page + 1)} aria-label="Next page">›</button>
    </nav>
  );
}
