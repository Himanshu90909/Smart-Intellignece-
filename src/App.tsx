import { lazy, Suspense, useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { products } from './data/products';
import { SmartVectorDB } from './lib/vectorDb';
import { CartProvider } from './store/cart';
import { AppStoreProvider } from './store/appStore';
import { ToastProvider } from './store/toast';
import { Navbar, Footer } from './components/layout/Navbar';
import { CartDrawer } from './components/cart/CartDrawer';
import { CompareBar } from './components/compare/CompareBar';
import { SkeletonCard } from './components/ui/primitives';
import { setVectorBuildMs } from './lib/metrics';
import HomePage from './pages/HomePage';

// Route-based code splitting: catalog/product/compare/live only load when visited
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const LivePage = lazy(() => import('./pages/LivePage'));
const EngineeringPage = lazy(() => import('./pages/EngineeringPage'));

const Rail = () => (
  <div className="pgrid" style={{ padding: 20, maxWidth: 1800, margin: '0 auto' }}>
    {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
);

export default function App() {
  // Built once — TF-IDF over the whole catalog at startup (fast: 300 docs).
  // Boot time recorded for the /engineering dashboard (real measurement).
  const vdb = useMemo(() => {
    const t0 = performance.now();
    const db = new SmartVectorDB(products);
    setVectorBuildMs(performance.now() - t0);
    return db;
  }, []);

  return (
    <ToastProvider>
      <CartProvider>
        <AppStoreProvider>
          <Navbar vdb={vdb} products={products} />

          <Suspense fallback={<Rail />}>
            <Routes>
              <Route path="/" element={<HomePage vdb={vdb} products={products} />} />
              <Route path="/catalog" element={<CatalogPage vdb={vdb} products={products} />} />
              <Route path="/search" element={<CatalogPage vdb={vdb} products={products} />} />
              <Route path="/product/:id" element={<ProductPage vdb={vdb} products={products} />} />
              <Route path="/compare" element={<ComparePage vdb={vdb} products={products} />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/engineering" element={<EngineeringPage />} />
              <Route path="*" element={<HomePage vdb={vdb} products={products} />} />
            </Routes>
          </Suspense>

          <Footer />
          <CartDrawer products={products} />
          <CompareBar products={products} />
        </AppStoreProvider>
      </CartProvider>
    </ToastProvider>
  );
}
