import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Product } from '../../types';
import { SmartVectorDB } from '../../lib/vectorDb';
import { formatPrice } from '../../lib/format';
import { useAppStore } from '../../store/appStore';
import { useDebounce } from '../../hooks/useDebounce';

interface Suggestion {
  product: Product;
  score: number;
}

/**
 * SearchBar with instant vector suggestions, keyboard navigation
 * (↑ ↓ Enter Esc), recent searches and shareable URL state (?q=).
 */
export function SearchBar({ vdb, products }: { vdb: SmartVectorDB; products: Product[] }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { searchHistory, pushSearch, removeSearch, clearSearchHistory } = useAppStore();

  const initial = params.get('q') || '';
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounced = useDebounce(value, 200);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(initial), [initial]);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const suggestions: Suggestion[] = useMemo(() => {
    if (debounced.trim().length < 2) return [];
    return vdb.search(debounced, 6);
  }, [debounced, vdb]);

  const totalItems = suggestions.length + searchHistory.length;
  const submit = (q: string) => {
    const query = q.trim();
    if (!query) return;
    pushSearch(query);
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open && (e.key === 'ArrowDown' || suggestions.length)) setOpen(true);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx === -1) submit(value);
      else if (activeIdx < suggestions.length) submit(suggestions[activeIdx].product.name);
      else {
        const h = searchHistory[activeIdx - suggestions.length];
        if (h) { setValue(h); submit(h); }
      }
    }
  };

  const showRecent = debounced.trim().length < 2 && searchHistory.length > 0;

  return (
    <div className="searchbar" ref={boxRef}>
      <input
        ref={inputRef}
        className="s-inp"
        placeholder="Search products with Vector AI..."
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Search products"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-suggestions"
        aria-autocomplete="list"
      />
      {value && (
        <button
          className="s-btn"
          style={{ right: 42, fontSize: 13 }}
          onClick={() => { setValue(''); inputRef.current?.focus(); }}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
      <button className="s-btn" onClick={() => submit(value)} aria-label="Search">🔍</button>

      {open && (
        <div className="suggest-panel" id="search-suggestions" role="listbox">
          {showRecent && (
            <>
              <div className="suggest-sec">
                Recent searches
                <button
                  className="c-clear"
                  style={{ marginLeft: 8, padding: '2px 8px', fontSize: 10 }}
                  onClick={(e) => { e.stopPropagation(); clearSearchHistory(); }}
                >
                  clear
                </button>
              </div>
              {searchHistory.map((h, i) => (
                <div key={h} style={{ display: 'flex' }}>
                  <button
                    className={`suggest-item${activeIdx === suggestions.length + i ? ' active' : ''}`}
                    style={{ flex: 1 }}
                    onClick={() => { setValue(h); submit(h); }}
                    role="option"
                    aria-selected={activeIdx === suggestions.length + i}
                  >
                    <span aria-hidden="true">🕐</span> {h}
                  </button>
                  <button
                    className="c-rm"
                    style={{ padding: '0 10px' }}
                    onClick={(e) => { e.stopPropagation(); removeSearch(h); }}
                    aria-label={`Remove ${h} from history`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </>
          )}
          {!showRecent && suggestions.length === 0 && debounced.trim().length >= 2 && (
            <div className="suggest-empty">No matches for “{debounced}” — try other keywords</div>
          )}
          {suggestions.length > 0 && <div className="suggest-sec">AI matches</div>}
          {suggestions.map((s, i) => (
            <button
              key={s.product.id}
              className={`suggest-item${activeIdx === i ? ' active' : ''}`}
              onClick={() => submit(s.product.name)}
              role="option"
              aria-selected={activeIdx === i}
            >
              <img src={s.product.image} alt="" />
              <span>{s.product.name}</span>
              <span className="suggest-meta">{formatPrice(s.product.price)}</span>
            </button>
          ))}
          {suggestions.length > 0 && (
            <button
              className="suggest-item"
              style={{ color: 'var(--accent3)', fontWeight: 700 }}
              onClick={() => submit(value)}
            >
              🔍 See all results for “{debounced}”
            </button>
          )}
        </div>
      )}
      <div className="sr-only">{products.length} products searchable</div>
    </div>
  );
}
