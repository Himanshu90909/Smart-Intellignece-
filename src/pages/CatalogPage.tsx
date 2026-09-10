import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Filters, Product, SortKey } from '../types';
import { SmartVectorDB } from '../lib/vectorDb';
import { parseNL, applyWithFallback } from '../lib/nlQuery';
import { applySorting, countActiveFilters, emptyFilters, matchesFilters, paginate } from '../lib/filters';
import { ProductCard } from '../components/product/ProductCard';
import { FilterPanel, FilterPanelBody } from '../components/product/FilterPanel';
import { ActiveFilterChips, SortDropdown, Pagination } from '../components/product/Toolbar';
import { SkeletonCard, EmptyState } from '../components/ui/primitives';
import { Drawer } from '../components/ui/Drawer';
import { BRANDS } from '../data/products';

const PER_PAGE = 24;

/** Encode filters into URL search params so views are shareable. */
function filtersToParams(base: URLSearchParams, f: Filters, sort: SortKey, page: number): URLSearchParams {
  const p = new URLSearchParams(base);
  p.delete('category'); p.delete('brand'); p.delete('price'); p.delete('rating'); p.delete('sort'); p.delete('page');
  p.delete('minPrice'); p.delete('maxPrice'); p.delete('discount'); p.delete('color'); p.delete('material'); p.delete('avail');
  if (f.categories.length) p.set('category', f.categories.join(','));
  if (f.brands.length) p.set('brand', f.brands.join(','));
  if (f.minPrice !== null) p.set('minPrice', String(f.minPrice));
  if (f.maxPrice !== null) p.set('maxPrice', String(f.maxPrice));
  if (f.minRating !== null) p.set('rating', String(f.minRating));
  if (f.minDiscount !== null) p.set('discount', String(f.minDiscount));
  if (f.colors.length) p.set('color', f.colors.join(','));
  if (f.materials.length) p.set('material', f.materials.join(','));
  if (f.availableOnly) p.set('avail', '1');
  if (sort !== 'relevance') p.set('sort', sort);
  if (page > 1) p.set('page', String(page));
  return p;
}

function paramsToFilters(p: URLSearchParams): { filters: Filters; sort: SortKey; page: number } {
  return {
    filters: {
      categories: p.get('category')?.split(',').filter(Boolean) || [],
      brands: p.get('brand')?.split(',').filter(Boolean) || [],
      minPrice: p.get('minPrice') ? Number(p.get('minPrice')) : null,
      maxPrice: p.get('price') ? Number(p.get('price')) : (p.get('maxPrice') ? Number(p.get('maxPrice')) : null),
      minRating: p.get('rating') ? Number(p.get('rating')) : null,
      minDiscount: p.get('discount') ? Number(p.get('discount')) : null,
      colors: p.get('color')?.split(',').filter(Boolean) || [],
      materials: p.get('material')?.split(',').filter(Boolean) || [],
      availableOnly: p.get('avail') === '1',
    },
    sort: (p.get('sort') as SortKey) || 'relevance',
    page: Math.max(1, Number(p.get('page')) || 1),
  };
}

export default function CatalogPage({ vdb, products }: {
  vdb: SmartVectorDB; products: Product[];
}) {
  const [params, setParams] = useSearchParams();
  const { filters, sort, page } = useMemo(() => paramsToFilters(params), [params]);
  const query = params.get('q') || '';
  const tag = params.get('tag') || '';
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [simulateLoading, setSimulateLoading] = useState(false);

  const update = (f: Filters, s: SortKey = sort, p = 1) => {
    setParams(filtersToParams(params, f, s, p), { replace: false });
  };

  // URL-driven filters: no full reloads, everything is in the address bar
  useEffect(() => {
    setSimulateLoading(true);
    const t = window.setTimeout(() => setSimulateLoading(false), 250);
    return () => window.clearTimeout(t);
  }, [params.toString()]);

  // Natural-language interpretation: parsed constraints are layered on top of
  // URL filters so both stay visible and shareable in the address bar.
  const nl = useMemo(
    () => (query ? parseNL(query, products) : null),
    [query, products],
  );
  const effectiveFilters = useMemo(() => {
    if (!nl) return filters;
    const merged: Filters = {
      categories: filters.categories.length ? filters.categories : nl.filters.categories,
      brands: filters.brands.length ? filters.brands : nl.filters.brands,
      minPrice: filters.minPrice ?? nl.filters.minPrice,
      maxPrice: filters.maxPrice ?? nl.filters.maxPrice,
      minRating: filters.minRating ?? nl.filters.minRating,
      minDiscount: filters.minDiscount ?? nl.filters.minDiscount,
      availableOnly: filters.availableOnly || nl.filters.availableOnly,
      colors: filters.colors.length ? filters.colors : nl.filters.colors,
      materials: filters.materials.length ? filters.materials : nl.filters.materials,
    };
    return merged;
  }, [filters, nl]);

  const nlChips = nl && nl.chips.length > 0 ? nl.chips : null;

  const { results, facetsRelaxed } = useMemo(() => {
    let list = products;
    if (tag === 'deal') list = list.filter((p) => p.badge === 'deal' || p.badge === 'sale');
    if (query) {
      const searchQuery = nl && nl.query ? nl.query : query;
      const attempt = (f: Filters) =>
        vdb.search(searchQuery, 60, (p) => matchesFilters(p, f)).map((r) => r.product);
      const applied = applyWithFallback(attempt, effectiveFilters);
      return { results: applied.results, facetsRelaxed: applied.relaxed };
    }
    let filtered = list.filter((p) => matchesFilters(p, effectiveFilters));
    if (sort !== 'relevance' || !query) filtered = applySorting(filtered, sort);
    return { results: filtered, facetsRelaxed: false };
  }, [products, query, tag, effectiveFilters, sort, vdb, nl]);

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  // Vector search already ranks by relevance; other sorts reorder explicitly.
  const sorted = query && sort === 'relevance' ? results : applySorting(results, sort);
  const pageItems = paginate(sorted, page, PER_PAGE);

  const title = query
    ? `🔍 "${query}"`
    : tag === 'deal'
      ? '⚡ Today\'s Deals'
      : filters.categories.length === 1
        ? `${filters.categories[0]}`
        : '🛍️ All Products';

  const activeCount = countActiveFilters(filters);

  return (
    <div className="page-layout">
      <FilterPanel products={products} filters={effectiveFilters} brands={BRANDS} onChange={(f) => update(f)} />

      <main aria-label="Product catalog">
        <div className="toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="sec-ttl" style={{ margin: '12px 0 2px' }}>{title}</h1>
            <div className="sec-sub" data-testid="result-count">{total} product{total !== 1 ? 's' : ''}{activeCount ? ` · ${activeCount} filter${activeCount !== 1 ? 's' : ''} active` : ''}</div>
          </div>
          <SortDropdown sort={sort} onChange={(s) => update(filters, s, query ? 1 : page)} />
        </div>

        <ActiveFilterChips filters={effectiveFilters} onChange={(f) => update(f)} />

        {nlChips && (
          <div className="ai-box" data-testid="nl-interpretation" style={{ padding: 14, marginBottom: 14 }}>
            <div className="ai-title" style={{ marginBottom: 6 }}>
              <span className="ai-icon" aria-hidden="true">🧠</span>
              <h2 style={{ fontSize: 14 }}>Smart Intelligence understood</h2>
            </div>
            <div className="chips-row" role="group" aria-label="Interpreted search filters" style={{ marginBottom: 8 }}>
              {nlChips.map((c) => (
                <span key={`${c.label}-${c.value}`} className="active-chip">
                  <strong>{c.label}:</strong> {c.value}
                </span>
              ))}
            </div>
            {facetsRelaxed && (
              <p style={{ fontSize: 11, color: 'var(--gold)', margin: '6px 0' }} data-testid="nl-relaxed">
                No products in the catalog carry the exact color/material facets — showing the
                closest vector matches for your other criteria instead.
              </p>
            )}
            <button
              className="c-clear"
              onClick={() => setParams(filtersToParams(params, filters, sort, 1), { replace: true })}
            >
              ✕ Clear interpretation
            </button>
          </div>
        )}

        {simulateLoading ? (
          <div className="pgrid">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : total === 0 ? (
          <EmptyState
            icon="🔍"
            title="No products found"
            message={query ? `Nothing matched "${query}" with these filters. Try removing some filters or different keywords.` : 'Try removing some filters.'}
            action={<button className="btn-ghost" onClick={() => update(emptyFilters())}>Clear all filters</button>}
          />
        ) : (
          <>
            <div className="pgrid">
              {pageItems.map((p) => (
                <ProductCard key={p.id} product={p} query={query} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={(pg) => update(filters, sort, pg)} />
          </>
        )}
      </main>

      {/* Mobile filter drawer */}
      <button className="filter-fab" onClick={() => setMobileFiltersOpen(true)} aria-label="Open filters">
        ⚙ Filters{activeCount ? ` (${activeCount})` : ''}
      </button>
      <Drawer open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} title="Filters" side="bottom">
        <FilterPanelBody
          products={products}
          filters={filters}
          brands={BRANDS}
          onChange={(f) => { update(f); setMobileFiltersOpen(false); }}
        />
      </Drawer>
    </div>
  );
}
