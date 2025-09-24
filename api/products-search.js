// /api/products-search.js
import { viator, setCors } from "./_viator";

export default async function handler(req, res) {
  // still keep this
  if (req.method === "OPTIONS") { 
    setCors(res); 
    return res.status(204).end(); 
  }

  try {                                     // <--- keep this
    setCors(res);

    const {
      q,
      destinationId,
      tags,
      page = 1,
      size = 12,
      lang = "en-US",
      currency = "USD",
      sort = "RELEVANCE"
    } = req.query;

    const filtering = {};
    if (q) filtering.searchTerm = q;
    if (destinationId) filtering.destination = { id: Number(destinationId) };
    if (tags) filtering.tags = String(tags).split(",").map(s => s.trim()).filter(Boolean);

    if (Object.keys(filtering).length === 0) {
      return res.status(400).json({ error: "Provide at least q, destinationId, or tags" });
    }

    const body = {
      filtering,
      paging: { page: Number(page), size: Number(size) },
      sortOrder: sort,
      currency
    };

    const data = await viator("/products/search", { method: "POST", language: lang, body });

    const items = (data?.products || []).map(p => ({
      code: p.productCode,
      title: p.title,
      thumbnail: p.primaryPhoto?.small || p.primaryPhoto?.url || "",
      rating: p.reviews?.combinedAverageRating ?? null,
      reviewCount: p.reviews?.totalCount ?? null,
      fromPrice: p.summary?.fromPrice ?? p.fromPrice?.price ?? null,
      currency: data?.currency || currency,
      deeplink: p.productUrl || p.deeplink || null
    }));

    res.status(200).json({ items, raw: data });

  } catch (err) {                           // <--- and keep this
    res.status(err.status || 500).json({
      error: "Viator error",
      detail: err.detail || String(err)
    });
  }
}
