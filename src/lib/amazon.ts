/**
 * Client for the amazonLive backend function (Base44).
 * The RapidAPI key stays server-side; this module only speaks to our proxy.
 */
const API_BASE = import.meta.env.VITE_AMAZON_API || '/api/amazonLive';
const REQUEST_TIMEOUT_MS = 15_000;

export interface AmazonLiveDetails {
  asin: string;
  title: string;
  price: string | null;
  originalPrice: string | null;
  currency: string;
  rating: string | null;
  numRatings: number | null;
  photo: string | null;
  url: string | null;
  byline: string | null;
  availability: string | null;
  condition: string | null;
  salesVolume: string | null;
  isPrime: boolean;
  isBestSeller: boolean;
  isAmazonChoice: boolean;
  aboutProduct: string[] | null;
  description: string | null;
  specs: Record<string, string> | null;
  buyBoxes: { title: string }[] | null;
}

export interface AmazonLiveResult {
  asin: string;
  title: string;
  price: string | null;
  originalPrice: string | null;
  rating: string | null;
  numRatings: number | null;
  photo: string | null;
  url: string | null;
  isPrime: boolean;
  isBestSeller: boolean;
  isAmazonChoice: boolean;
}

async function callApi(params: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}?${params}`, { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The live data request timed out. Please try again.');
    }
    throw new Error('Unable to reach the live data service. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error;
    if (res.status === 429) throw new Error('The live data service is busy. Please wait a moment and retry.');
    if (res.status === 404) throw new Error('The live data endpoint is not available in this deployment.');
    throw new Error(message || `Live data request failed (${res.status}).`);
  }
  return data;
}

export async function fetchAmazonDetails(asin: string, country = 'US'): Promise<AmazonLiveDetails> {
  const data = (await callApi(`mode=details&asin=${encodeURIComponent(asin)}&country=${encodeURIComponent(country)}`)) as { details: AmazonLiveDetails };
  return data.details;
}

export async function searchAmazon(query: string, country = 'US'): Promise<AmazonLiveResult[]> {
  const data = (await callApi(`mode=search&query=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}`)) as { products: AmazonLiveResult[] };
  return data.products;
}
