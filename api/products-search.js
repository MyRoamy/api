// /api/products-search.js
import { viator, setCors } from "./_viator";
import { getCache, setCache } from "./_cache";

async function resolveDestinationIdByName(lang, name) {
  // ... (unchanged)
}

function thumbFromSearch(p) {
  // ... (unchanged)
}

// ↓↓↓ PASTE THE NEW HELPER RIGHT HERE ↓↓↓
function thumbFromDetail(d) {
  const arr = d.images || d.photos || [];
  if (Array.isArray(arr) && arr.length) {
    const img = arr[0];
    return (
      img.small ||
      img.url ||
      (img.variants && img.variants[0] && img.variants[0].url) ||
      img.thumbnailUrl ||
      img.squareUrl ||
      ""
    );
  }
  return (
    d.primaryPhoto?.small ||
    d.primaryPhoto?.url ||
    ""
  );
}
// ↑↑↑ PASTED HERE ↑↑↑

// Main handler
export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);

    // ... your existing query parsing + filtering build ...

    const data = await viator("/products/search", { method: "POST", language: lang, body });
    let products = data?.products || [];

    // Initial map
    let items = products.map(p => ({
      code: p.productCode,
      title: p.title,
      thumbnail: thumbFromSearch(p),
      rating: p.reviews?.combinedAverageRating ?? null,
      reviewCount: p.reviews?.totalCount ?? null,
      fromPrice: p.summary?.fromPrice ?? p.fromPrice?.price ?? null,
      currency: data?.currency || currency,
      deeplink: p.productUrl || p.deeplink || null
    }));

    // REPLACE your old enrichment block with this BULK version
    if (enrichImages !== "false") {
      const missing = items.filter(i => !i.thumbnail);
      if (missing.length) {
        const productCodes = missing.map(m => m.code).slice(0, 500);
        try {
          const bulk = await viator("/products/bulk", {
            method: "POST",
            language: lang,
            body: { productCodes }
          });
          if (Array.isArray(bulk)) {
            const byCode = new Map(bulk.map(d => [d.productCode, d]));
            for (const item of items) {
              if (!item.thumbnail) {
                const d = byCode.get(item.code);
                if (d) {
                  const t = thumbFromDetail(d);
                  if (t) item.thumbnail = t;
                  if (!item.deeplink && d.productUrl) item.deeplink = d.productUrl;
                }
              }
            }
          }
        } catch (e) {
          console.warn("bulk image enrich failed", e);
        }
      }
    }

    return res.status(200).json({ items, raw: data });
  } catch (err) {
    return res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
