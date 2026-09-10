import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * AppStore — wishlist, compare list, recently viewed and search history.
 * All slices are localStorage-backed; the original app lost the wishlist on
 * refresh, this fixes that bug.
 */
interface AppStoreValue {
  // wishlist
  wishlist: Set<number>;
  toggleWish: (id: number) => void;
  inWishlist: (id: number) => boolean;
  // compare
  compareIds: number[];
  toggleCompare: (id: number) => void;
  inCompare: (id: number) => boolean;
  clearCompare: () => void;
  COMPARE_LIMIT: number;
  // recently viewed
  recentIds: number[];
  pushRecent: (id: number) => void;
  // search history
  searchHistory: string[];
  pushSearch: (q: string) => void;
  removeSearch: (q: string) => void;
  clearSearchHistory: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function usePersistedSet(key: string): [Set<number>, (updater: (s: Set<number>) => Set<number>) => void] {
  const [set, setSet] = useState<Set<number>>(() => {
    try {
      return new Set<number>(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch {
      return new Set<number>();
    }
  });
  const update = useCallback(
    (updater: (s: Set<number>) => Set<number>) => {
      setSet((prev) => {
        const next = updater(new Set(prev));
        localStorage.setItem(key, JSON.stringify([...next]));
        return next;
      });
    },
    [key],
  );
  return [set, update];
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = usePersistedSet('si_wishlist');
  const [compareIds, setCompareIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('si_compare') || '[]');
    } catch {
      return [];
    }
  });
  const [recentIds, setRecentIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('si_recent') || '[]');
    } catch {
      return [];
    }
  });
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('si_searches') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('si_compare', JSON.stringify(compareIds));
  }, [compareIds]);
  useEffect(() => {
    localStorage.setItem('si_recent', JSON.stringify(recentIds));
  }, [recentIds]);
  useEffect(() => {
    localStorage.setItem('si_searches', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const value = useMemo<AppStoreValue>(
    () => ({
      COMPARE_LIMIT: 4,
      wishlist,
      toggleWish: (id) =>
        setWishlist((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id]))),
      inWishlist: (id) => wishlist.has(id),
      compareIds,
      inCompare: (id) => compareIds.includes(id),
      toggleCompare: (id) => {
        setCompareIds((list) => {
          if (list.includes(id)) return list.filter((x) => x !== id);
          if (list.length >= 4) return list; // limit enforced silently, UI toasts
          return [...list, id];
        });
      },
      clearCompare: () => setCompareIds([]),
      recentIds,
      pushRecent: (id) =>
        setRecentIds((list) => [id, ...list.filter((x) => x !== id)].slice(0, 10)),
      searchHistory,
      pushSearch: (q) =>
        setSearchHistory((list) => [q, ...list.filter((x) => x !== q)].slice(0, 8)),
      removeSearch: (q) => setSearchHistory((list) => list.filter((x) => x !== q)),
      clearSearchHistory: () => setSearchHistory([]),
    }),
    [wishlist, compareIds, recentIds, searchHistory, setWishlist],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppStoreProvider');
  return ctx;
}
