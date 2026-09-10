import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../types';

export interface CartItem extends Product {
  qty: number;
}

interface CartContextValue {
  cart: CartItem[];
  addToCart: (p: Product, qty?: number) => void;
  removeFromCart: (id: number) => void;
  changeQty: (id: number, delta: number) => void;
  setQty: (id: number, qty: number) => void;
  clearCart: () => void;
  inCart: (id: number) => boolean;
  count: number;
  subtotal: number;
  savings: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /** True when the last localStorage write failed (state rolled back). */
  persistFailed: boolean;
  acknowledgePersistFailure: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

import { CART_LIMITS } from './cartConstants';

const STORAGE_KEY = 'si_cart';

function load(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(load);
  const [isOpen, setOpen] = useState(false);
  const [persistFailed, setPersistFailed] = useState(false);

  // Optimistic persistence: write the new state, roll back if storage fails.
  useEffect(() => {
    const previous = load();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      setPersistFailed(false);
    } catch {
      setCart(previous); // rollback — storage unavailable (private mode, quota, etc.)
      setPersistFailed(true);
    }
  }, [cart]);

  const addToCart = useCallback((p: Product, qty = 1) => {
    setCart((c) => (c.some((x) => x.id === p.id) ? c : [...c, { ...p, qty }]));
    setOpen(true);
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart((c) => c.filter((x) => x.id !== id));
  }, []);

  const changeQty = useCallback((id: number, delta: number) => {
    setCart((c) =>
      c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, x.qty + delta) } : x)),
    );
  }, []);

  const setQtyById = useCallback((id: number, qty: number) => {
    setCart((c) => c.map((x) => (x.id === id ? { ...x, qty: Math.max(CART_LIMITS.minQty, Math.min(CART_LIMITS.maxQty, qty)) } : x)));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const value = useMemo(() => {
    const count = cart.reduce((a, x) => a + x.qty, 0);
    const subtotal = cart.reduce((a, x) => a + x.price * x.qty, 0);
    const savings = cart.reduce((a, x) => a + (x.orig - x.price) * x.qty, 0);
    return {
      cart,
      addToCart,
      removeFromCart,
      changeQty,
      setQty: setQtyById,
      clearCart,
      inCart: (id: number) => cart.some((x) => x.id === id),
      count,
      subtotal,
      savings,
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      persistFailed,
      acknowledgePersistFailure: () => setPersistFailed(false),
    };
  }, [cart, addToCart, removeFromCart, changeQty, setQtyById, clearCart, isOpen, persistFailed]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
