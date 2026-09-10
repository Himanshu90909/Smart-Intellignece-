// amazonLive — server-side proxy for the Real-Time Amazon Data API (RapidAPI).
// Keeps RAPIDAPI_KEY off the client (secret lives in the app environment).
// GET ?mode=details&asin=B07ZPKBL9V&country=US  → product details
// GET ?mode=search&query=running+shoes&country=US → top search results

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface AmazonProduct {
  asin?: string;
  product_title?: string;
  product_price?: string | null;
  product_original_price?: string | null;
  product_star_rating?: string | null;
  product_num_ratings?: number | null;
  product_photo?: string | null;
  product_url?: string | null;
  is_prime?: boolean;
  is_best_seller?: boolean;
  is_amazon_choice?: boolean;
  [k: string]: unknown;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const key = Deno.env.get("RAPIDAPI_KEY") as string;
  if (!key) return json({ error: "Live data is not configured for this deployment." }, 503);

  let mode = "details", country = "US", asin = "", query = "";
  try {
    const url = new URL(req.url);
    mode = url.searchParams.get("mode") || "details";
    country = url.searchParams.get("country") || "US";
    asin = url.searchParams.get("asin") || "";
    query = url.searchParams.get("query") || "";
    if (!asin && !query && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      mode = body.mode || mode;
      country = body.country || country;
      asin = body.asin || asin;
      query = body.query || query;
    }
  } catch { /* fall through with defaults */ }

  let apiUrl: string;
  if (mode === "search") {
    if (!query) return json({ error: "query is required for search mode" }, 400);
    apiUrl = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}&page=1`;
  } else {
    if (!asin) return json({ error: "asin is required for details mode" }, 400);
    apiUrl = `https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${encodeURIComponent(asin)}&country=${encodeURIComponent(country)}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const upstream = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "real-time-amazon-data.p.rapidapi.com",
        "x-rapidapi-key": key,
      },
    }).finally(() => clearTimeout(timeout));
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return json({ error: upstream.status === 429 ? "Live data service is busy. Please retry shortly." : "Live data service failed to respond." }, upstream.status === 429 ? 429 : 502);
    }

    if (mode === "search") {
      const products = ((data?.data?.products || []) as AmazonProduct[]).slice(0, 12).map((p) => ({
        asin: p.asin,
        title: p.product_title,
        price: p.product_price,
        originalPrice: p.product_original_price,
        rating: p.product_star_rating,
        numRatings: p.product_num_ratings,
        photo: p.product_photo,
        url: p.product_url,
        isPrime: p.is_prime,
        isBestSeller: p.is_best_seller,
        isAmazonChoice: p.is_amazon_choice,
      }));
      return json({ status: "OK", mode, country, query, count: products.length, products });
    }

    const d = (data?.data || {}) as Record<string, unknown>;
    return json({
      status: "OK",
      mode,
      country,
      details: {
        asin: d.asin,
        title: d.product_title,
        price: d.product_price,
        originalPrice: d.product_original_price,
        currency: d.currency,
        rating: d.product_star_rating,
        numRatings: d.product_num_ratings,
        photo: d.product_photo,
        url: d.product_url,
        byline: d.product_byline,
        availability: d.product_availability,
        condition: d.product_condition,
        salesVolume: d.sales_volume,
        isPrime: d.is_prime,
        isBestSeller: d.is_best_seller,
        isAmazonChoice: d.is_amazon_choice,
        aboutProduct: d.about_product,
        description: d.product_description,
        specs: d.product_information,
        buyBoxes: d.buy_boxes,
      },
    });
  } catch (e) {
    return json({ error: e instanceof DOMException && e.name === "AbortError" ? "Live data request timed out." : "Failed to reach live data service." }, 502);
  }
});
