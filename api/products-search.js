import { viator, setCors } from "./_viator";
import { getCache, setCache } from "./_cache";

async function resolveDestinationIdByName(lang, name) {
  let index = getCache(`destinations:${lang}`);
  if (!index) {
    const data = await viator("/destinations", { language: lang });
    index = (data?.destinations || data || []).map(d => ({
      id: d.destinationId || d.id, name: d.name, country: d.country || "", region: d.region || ""
    }));
    setCache(`destinations:${lang}`, index, 24*60*60*1000);
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
    p.image?.url || ""
  );
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
      enrichImages = "true" // allow turning off if needed
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
    if (destId) filtering.destination = String(destId); // <-- FIXED SHAPE (string/id)
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
    let products = data?.products || [];

    // Build initial items
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

    // Enrich thumbnails only for items missing them (cap to 8 calls)
    if (enrichImages !== "false") {
      const needs = items.filter(i => !i.thumbnail).slice(0, 8);
      if (needs.length) {
        const details = await Promise.allSettled(
          needs.map(i => viator(`/products/${encodeURIComponent(i.code)}`, { language: lang }))
        );
        details.forEach((r, idx) => {
          if (r.status === "fulfilled") {
            const d = r.value || {};
            const thumb =
              d.primaryPhoto?.small ||
              d.primaryPhoto?.url ||
              d.photos?.[0]?.small ||
              d.photos?.[0]?.url ||
              d.image?.url || "";
            if (thumb) {
              const code = needs[idx].code;
              const target = items.find(x => x.code === code);
              if (target) target.thumbnail = thumb;
            }
          }
        });
      }
    }

    res.status(200).json({ items, raw: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
