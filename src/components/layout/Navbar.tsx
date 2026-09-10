import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../../types';
import type { Product } from '../../types';
import type { SmartVectorDB } from '../../lib/vectorDb';
import { useCart } from '../../store/cart';
import { useAppStore } from '../../store/appStore';
import { SearchBar } from '../search/SearchBar';

export function Navbar({ vdb, products }: { vdb: SmartVectorDB; products: Product[] }) {
  const { count, openCart } = useCart();
  const { compareIds } = useAppStore();
  const navigate = useNavigate();

  return (
    <header>
      <div className="h-wrap">
        <button className="logo" onClick={() => navigate('/')} >
          <div className="logo-icon" aria-hidden="true">🧠</div>
          <div>
            <div className="logo-text">Smart Intelligence</div>
            <div className="logo-sub">AI Shopping</div>
          </div>
        </button>
        <SearchBar vdb={vdb} products={products} />
        <div className="h-actions">
          <Link to="/compare" className="hbtn" aria-label={`Compare ${compareIds.length} selected`}>
            ⚖️ Compare{compareIds.length > 0 && <span className="cart-cnt">{compareIds.length}</span>}
          </Link>
          <button className="hbtn cart-btn" onClick={openCart} aria-label={`Cart ${count} items`}>
            <span aria-hidden="true">🛒</span> Cart
            <span className="cart-cnt" data-testid="cart-count">{count}</span>
          </button>
        </div>
      </div>
      <nav className="h-nav" aria-label="Categories">
        <div className="h-nav-inner">
          {CATEGORIES.map((c) => (
            <NavLink
              key={c.key}
              to={c.key === 'all' ? '/catalog' : c.key === 'deal' ? '/catalog?tag=deal' : `/catalog?category=${c.key}`}
              className={({ isActive }) => `nb${isActive && c.key === 'all' ? ' act' : ''}`}
              style={({ isActive }) => (isActive && c.key !== 'all' ? { color: 'var(--accent3)', borderBottom: '2px solid var(--accent)' } : undefined)}
            >
              {c.icon} {c.label}
            </NavLink>
          ))}
          <NavLink to="/" end className="nb" style={{ color: 'var(--accent3)' }}>✨ AI Search</NavLink>
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-col">
          <h4>Smart Intelligence</h4>
          <div>On-device vector AI shopping.</div>
          <div>TF-IDF + cosine similarity engine.</div>
        </div>
        <div className="footer-col">
          <h4>Shop</h4>
          {CATEGORIES.slice(1, 6).map((c) => (
            <Link key={c.key} to={`/catalog?category=${c.key}`}>{c.label}</Link>
          ))}
        </div>
        <div className="footer-col">
          <h4>Features</h4>
          <Link to="/catalog">Catalog & filters</Link>
          <Link to="/compare">AI comparison</Link>
          <Link to="/engineering">Engineering metrics</Link>
          <Link to="/">Vector search</Link>
        </div>
      </div>
      <div className="footer-bot">🧠 <strong>Smart Intelligence</strong> — On-Device Vector AI Shopping · TF-IDF + Cosine Similarity · No External API · © 2026</div>
    </footer>
  );
}
