import { useMemo } from 'react';
import { CATEGORIES, type Filters, type Product } from '../../types';
import { PRICE_BUCKETS, MAX_PRICE, emptyFilters, countActiveFilters } from '../../lib/filters';
import { facetCounts, productColors, productMaterials } from '../../lib/facets';
import { formatPrice } from '../../lib/format';

export interface FilterPanelProps {
  products: Product[];
  filters: Filters;
  brands: string[];
  onChange: (f: Filters) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sb-sec">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function FilterPanelBody({ products, filters, brands, onChange }: FilterPanelProps) {
  const categories = CATEGORIES.filter((c) => c.key !== 'all' && c.key !== 'deal');
  const catCounts = new Map<string, number>();
  for (const p of products) catCounts.set(p.category, (catCounts.get(p.category) || 0) + 1);

  // Facet counts computed once per products prop — derived from real text
  const colorFacets = useMemo(() => facetCounts(products, productColors), [products]);
  const materialFacets = useMemo(() => facetCounts(products, productMaterials), [products]);

  const toggleIn = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const activeCount = countActiveFilters(filters);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong style={{ fontSize: 13 }}>Filters</strong>
        {activeCount > 0 && (
          <button
            className="c-clear"
            onClick={() => onChange(emptyFilters())}
            aria-label={`Clear all ${activeCount} filters`}
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <Section title="Category">
        {categories.map((c) => (
          <label key={c.key} className="filter-item">
            <input
              type="checkbox"
              checked={filters.categories.includes(c.key)}
              onChange={() => onChange({ ...filters, categories: toggleIn(filters.categories, c.key) })}
            />
            <span>{c.icon} {c.label}</span>
            <span className="filter-count">{catCounts.get(c.key) || 0}</span>
          </label>
        ))}
      </Section>

      <Section title="Brand">
        <div>
          {brands.map((b) => (
            <button
              key={b}
              className={`brand-tag${filters.brands.includes(b) ? ' act' : ''}`}
              onClick={() => onChange({ ...filters, brands: toggleIn(filters.brands, b) })}
              aria-pressed={filters.brands.includes(b)}
            >
              {b}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Price">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }} role="group" aria-label="Price range">
          <label style={{ flex: 1, fontSize: 11, color: 'var(--dim)' }}>
            Min ₹
            <input
              type="number"
              min={0}
              max={MAX_PRICE}
              className="range-inp"
              value={filters.minPrice ?? ''}
              placeholder="0"
              onChange={(e) => onChange({ ...filters, minPrice: e.target.value ? Math.max(0, Number(e.target.value)) : null })}
              aria-label="Minimum price in rupees"
            />
          </label>
          <label style={{ flex: 1, fontSize: 11, color: 'var(--dim)' }}>
            Max ₹
            <input
              type="number"
              min={0}
              max={MAX_PRICE}
              className="range-inp"
              value={filters.maxPrice ?? ''}
              placeholder={String(MAX_PRICE)}
              onChange={(e) => onChange({ ...filters, maxPrice: e.target.value ? Math.min(MAX_PRICE, Number(e.target.value)) : null })}
              aria-label="Maximum price in rupees"
            />
          </label>
        </div>
        {PRICE_BUCKETS.map((b) => (
          <label key={b} className="filter-item">
            <input
              type="radio"
              name="price"
              checked={filters.maxPrice === b && filters.minPrice === null}
              onChange={() => onChange({ ...filters, minPrice: null, maxPrice: b })}
            />
            <span>Under {formatPrice(b)}</span>
          </label>
        ))}
        <label className="filter-item">
          <input
            type="radio"
            name="price"
            checked={filters.maxPrice === null && filters.minPrice === null}
            onChange={() => onChange({ ...filters, minPrice: null, maxPrice: null })}
          />
          <span>Any price</span>
        </label>
      </Section>

      <Section title="Rating">
        {[4.5, 4, 3.5, 3].map((r) => (
          <label key={r} className="filter-item">
            <input
              type="radio"
              name="rating"
              checked={filters.minRating === r}
              onChange={() => onChange({ ...filters, minRating: r })}
            />
            <span>★{r} & up</span>
          </label>
        ))}
        <label className="filter-item">
          <input
            type="radio"
            name="rating"
            checked={filters.minRating === null}
            onChange={() => onChange({ ...filters, minRating: null })}
          />
          <span>Any rating</span>
        </label>
      </Section>

      <Section title="Discount">
        {[50, 30, 10].map((d) => (
          <label key={d} className="filter-item">
            <input
              type="radio"
              name="discount"
              checked={filters.minDiscount === d}
              onChange={() => onChange({ ...filters, minDiscount: filters.minDiscount === d ? null : d })}
            />
            <span>{d}% off or more</span>
          </label>
        ))}
      </Section>

      {colorFacets.length > 0 && (
        <Section title={`Color (${colorFacets.length})`}>
          <div>
            {colorFacets.map(([c, n]) => (
              <button
                key={c}
                className={`brand-tag${filters.colors.includes(c) ? ' act' : ''}`}
                onClick={() => onChange({ ...filters, colors: toggleIn(filters.colors, c) })}
                aria-pressed={filters.colors.includes(c)}
              >
                {c} <span className="filter-count">{n}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {materialFacets.length > 0 && (
        <Section title={`Material (${materialFacets.length})`}>
          <div>
            {materialFacets.map(([m, n]) => (
              <button
                key={m}
                className={`brand-tag${filters.materials.includes(m) ? ' act' : ''}`}
                onClick={() => onChange({ ...filters, materials: toggleIn(filters.materials, m) })}
                aria-pressed={filters.materials.includes(m)}
              >
                {m} <span className="filter-count">{n}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Availability">
        <label className="filter-item">
          <input
            type="checkbox"
            checked={filters.availableOnly}
            onChange={() => onChange({ ...filters, availableOnly: !filters.availableOnly })}
          />
          <span>⚡ In stock only</span>
        </label>
        <p style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
          Max price in catalog: {formatPrice(MAX_PRICE)}
        </p>
      </Section>
    </div>
  );
}

/** Sticky desktop sidebar wrapper. */
export function FilterPanel(props: FilterPanelProps) {
  return (
    <aside className="sidebar" aria-label="Product filters">
      <FilterPanelBody {...props} />
    </aside>
  );
}
