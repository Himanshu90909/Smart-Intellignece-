export const formatPrice = (p: number): string =>
  '₹' + Number(p).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const discountPct = (price: number, orig: number): number =>
  Math.round((1 - price / orig) * 100);

export const formatStars = (r: number): string => {
  const f = Math.floor(r);
  let s = '';
  for (let i = 0; i < 5; i++) s += i < f ? '★' : i === f && r - f >= 0.5 ? '✩' : '☆';
  return s;
};

/** Split text into highlighted / plain segments for search-result highlighting. */
export function highlightSegments(text: string, query: string): { text: string; hit: boolean }[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return [{ text, hit: false }];
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  );
  return text
    .split(pattern)
    .filter((s) => s.length > 0)
    .map((seg) => ({ text: seg, hit: terms.includes(seg.toLowerCase()) }));
}
