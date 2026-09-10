/**
 * amazonLive — server-side proxy for the Real-Time Amazon Data API (RapidAPI).
 * Keeps the RAPIDAPI_KEY off the client. Supports two modes:
 *   mode=details&asin=B07ZPKBL9V&country=US  → full product details
 *   mode=search&query=running+shoes&country=US → search results (top items)
 */
export default async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    return res.status(503).json({ error: 'Live data is not configured for this deployment.' });
  }

  const mode = (req.query.mode || req.body?.mode || 'details').toString();
  const country = (req.query.country || req.body?.country || 'US').toString();
  const asin = (req.query.asin || req.body?.asin || '').toString();
  const query = (req.query.query || req.body?.query || '').toString();

  let url;
  if (mode === 'search') {
    if (!query) return res.status(400).json({ error: 'query is required for search mode' });
    url = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&country=${encodeURIComponent(country)}&page=1`;
  } else {
    if (!asin) return res.status(400).json({ error: 'asin is required for details mode' });
    url = `https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${encodeURIComponent(asin)}&country=${encodeURIComponent(country)}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com',
        'x-rapidapi-key': key,
      },
    }).finally(() => clearTimeout(timeout));
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status === 429 ? 429 : 502).json({ error: r.status === 429 ? 'Live data service is busy. Please retry shortly.' : 'Live data service failed to respond.' });
    }

    // Normalize: strip heavy/irrelevant fields so the client payload stays small
    if (mode === 'search' && data?.data?.products) {
      const products = data.data.products.slice(0, 12).map((p) => ({
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
      return res.json({ status: 'OK', mode, country, query, count: products.length, products });
    }

    const d = data?.data || {};
    const details = {
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
    };
    return res.json({ status: 'OK', mode, country, details });
  } catch (e) {
    return res.status(502).json({ error: e?.name === 'AbortError' ? 'Live data request timed out.' : 'Failed to reach live data service.' });
  }
}
