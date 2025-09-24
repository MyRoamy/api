import { viator, setCors } from "./_viator";
import { getCache, setCache } from "./_cache";

async function resolveDestinationIdByName(lang, name) {
  // Try cache first
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

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);
    const {
      q,
      destinationId,
      destinationName,      // NEW: let callers pass a name instead
      tags,
      page = 1,
      size = 12,
      lang = "en-US",
      currency = "USD",
      sort = "RELEVANCE"
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
    if (destId) filtering.destination = String(destId);
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
  } catch (err) {
    res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
