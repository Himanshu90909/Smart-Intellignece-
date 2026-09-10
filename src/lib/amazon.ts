/**
 * Client for the amazonLive backend function (Base44).
 * The RapidAPI key stays server-side; this module only speaks to our proxy.
 */
const API_BASE =
  import.meta.env.VITE_AMAZON_API ||
  'https://solene-7c76de54.base44.app/functions/amazonLive';

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
  const res = await fetch(`${API_BASE}?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || `API error ${res.status}`);
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
