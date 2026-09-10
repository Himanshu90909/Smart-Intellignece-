/**
 * lib/metrics — REAL runtime measurements for the /engineering dashboard.
 * Nothing here is hardcoded: every number is measured live in the browser
 * via the Performance API at the moment the page reads it.
 */

export interface BundleEntry {
  name: string;
  type: 'js' | 'css' | 'img' | 'other';
  transferKB: number;
  decodedKB: number;
}

const mark = (name: string) => performance.mark(`si-${name}`);

/** Measured once at app boot (App.tsx). */
let vectorBuildMs: number | null = null;
export function setVectorBuildMs(ms: number) { vectorBuildMs = ms; }
export function getVectorBuildMs(): number | null { return vectorBuildMs; }

export function measure<T>(name: string, fn: () => T): { result: T; ms: number } {
  mark(`${name}-start`);
  const result = fn();
  const ms = performance.measure(`si-${name}`, { start: `si-${name}-start` }).duration;
  return { result, ms };
}

/** Live Web Vitals: LCP (so far), CLS (cumulative), long tasks (TBT proxy). */
export interface WebVitals {
  lcpMs: number | null;
  cls: number | null;
  longTaskMs: number;
}

export function readWebVitals(): WebVitals {
  const vitals: WebVitals = { lcpMs: null, cls: null, longTaskMs: 0 };

  const paintEntries = performance.getEntriesByType('paint');
  const lcpEntries = performance.getEntriesByType('largest-contentful-paint' as unknown as string) as PerformanceEntry[];
  const largest = lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null;
  vitals.lcpMs = largest ?? (paintEntries.find((e) => e.name === 'first-contentful-paint')?.startTime ?? null);

  try {
    const layoutShifts = (performance.getEntriesByType('layout-shift') as unknown as { value: number; hadRecentInput: boolean }[]);
    vitals.cls = layoutShifts
      .filter((s) => !s.hadRecentInput)
      .reduce((a, s) => a + s.value, 0);
  } catch { /* layout-shift unsupported in this browser */ }

  try {
    const longTasks = performance.getEntriesByType('longtask') as PerformanceEntry[];
    vitals.longTaskMs = longTasks.reduce((a, t) => a + t.duration, 0);
  } catch { /* longtask unsupported */ }

  return vitals;
}

/** Loaded resource sizes (the actual bundles the browser fetched). */
export function readBundle(): BundleEntry[] {
  return performance
    .getEntriesByType('resource')
    .filter((e) => /\.(js|css|png|jpg|webp|woff2?)(\?|$)/i.test(e.name) || e.name.includes('/assets/'))
    .map((e) => {
      const r = e as PerformanceResourceTiming;
      const type: BundleEntry['type'] = r.name.endsWith('.css') ? 'css' : r.name.endsWith('.js') ? 'js' : /\.(png|jpg|webp)/i.test(r.name) ? 'img' : 'other';
      return {
        name: r.name.split('/').pop()?.split('?')[0] || r.name,
        type,
        transferKB: Math.round((r.transferSize || 0) / 102.4) / 10,
        decodedKB: Math.round((r.decodedBodySize || 0) / 102.4) / 10,
      };
    })
    .filter((b) => b.transferKB > 0);
}

/** Dom-content-loaded + load timings from the navigation entry. */
export function readNavigation() {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  return {
    domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    loadMs: nav ? Math.round(nav.loadEventEnd) : null,
    transferKB: nav ? Math.round(nav.transferSize / 1024) : null,
  };
}
