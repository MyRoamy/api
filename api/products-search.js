// /api/products-search.js
import { viator, setCors } from "./_viator";
import { getCache, setCache } from "./_cache";

async function resolveDestinationIdByName(lang, name) {
  let index = getCache(`destinations:${lang}`);
  if (!index) {
    const data = await viator("/destinations", { language: lang });
    index = (data?.destinations || data || []).map(d => ({
      id: d.destinationId || d.id,
      name: d.name,
      country: d.country || "",
      region: d.region || ""
    }));
    setCache(`destinations:${lang}`, index, 24 * 60 * 60 * 1000); // 24h
  }
  const norm = String(name).trim().toLowerCase();
  const exact = index.find(d => d.name?.toLowerCase() === norm);
  const contains = exact ? null : index.find(d =>
    d.name?.toLowerCase().includes(norm) ||
    d.country?.toLowerCase().includes(norm) ||
    d.region?.toLowerCase().includes(norm)
  );
  return (exact || contains)?.id || null;
}

function thumbFromSearch(p) {
  return (
    p.primaryPhoto?.small ||
    p.primaryPhoto?.url ||
    p.primaryPhoto?.variants?.[0]?.url ||
    p.photos?.[0]?.small ||
    p.photos?.[0]?.url ||
    p.image?.url ||
    ""
  );
}

function thumbFromDetail(d) {
  const arr = d.images || d.photos || [];
  if (Array.isArray(arr) && arr.length) {
    const img = arr[0];
    return (
      img.small ||
      img.url ||
      img?.variants?.[0]?.url ||
      img.thumbnailUrl ||
      img.squareUrl ||
      ""
    );
  }
  return d.primaryPhoto?.small || d.primaryPhoto?.url || "";
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);

    const {
      q,
      destinationId,
      destinationName,
      tags,
      page = 1,
      size = 12,
      lang = "en-US",
      currency = "USD",
      sort = "RELEVANCE",
      enrichImages = "true"
    } = req.query;

    let destId = destinationId ? Number(destinationId) : null;
    if (!destId && destinationName) {
      destId = await resolveDestinationIdByName(lang, destinationName);
      if (!destId) {
        return res.status(400).json({ error: `Unknown destinationName "${destinationName}"` });
      }
    }

    const filtering = {};
    if (q) filtering.searchTerm = q;
    if (destId) filtering.destination = String(destId); // Viator expects string/number, not object
    if (tags) filtering.tags = String(tags).split(",").map(s => s.trim()).filter(Boolean);

    if (Object.keys(filtering).length === 0) {
      return res.status(400).json({ error: "Provide at least q, destinationId, destinationName, or tags" });
    }

    const body = {
      filtering,
      paging: { page: Number(page), size: Number(size) },
      sortOrder: sort,
      currency
    };

    const data = await viator("/products/search", { method: "POST", language: lang, body });
    const products = data?.products || [];

    // Initial map (may have empty thumbnails)
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

    // Enrich missing thumbnails with one bulk detail call
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
