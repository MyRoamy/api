import { viator, setCors } from "./_viator";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);
    const { q, destination, page = 1, size = 12, currency = "USD", lang = "en-US" } = req.query;

    // Your program allows /products/search (POST)
    const payload = {
      searchTerm: q || undefined,
      destination: destination || undefined,
      paging: { page: Number(page), size: Number(size) },
      currency
    };

    const data = await viator("/products/search", { method: "POST", language: lang, body: payload });

    // Shape to frontend-friendly fields (adjust if your response fields differ)
    const items = (data?.products || []).map(p => ({
      code: p.productCode,
      title: p.title,
      thumbnail: p.primaryPhoto?.small || p.primaryPhoto?.url || "",
      rating: p.reviews?.combinedAverageRating ?? null,
      reviewCount: p.reviews?.totalCount ?? null,
      fromPrice: p.summary?.fromPrice ?? p.fromPrice?.price ?? null,
      currency: data?.currency || currency,
      // If your affiliate response includes a proper deeplink/tracking field, map it here
      deeplink: p.productUrl || p.deeplink || null
    }));

    res.status(200).json({ items, raw: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
