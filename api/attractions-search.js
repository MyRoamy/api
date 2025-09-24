// attractions-search.js
import { viator, setCors } from "./_viator";

function thumbFromAttraction(a = {}) {
  const first =
    a.images?.[0] ||
    a.image ||          // sometimes single object
    a.primaryPhoto ||   // keep parity with product shape
    {};
  return (
    first.small ||
    first.thumbnailUrl ||
    first.squareUrl ||
    first.url ||
    first?.variants?.[0]?.url ||
    ""
  );
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);
    const { q, destination, page = 1, size = 12, lang = "en-US" } = req.query;

    const payload = {
      searchTerm: q || undefined,
      destination: destination || undefined,
      paging: { page: Number(page), size: Number(size) }
    };

    const data = await viator("/attractions/search", {
      method: "POST",
      language: lang,
      body: payload
    });

    const attractions = Array.isArray(data?.attractions) ? data.attractions : (data?.data || []);
    const items = attractions.map(a => ({
      id: a.attractionId || a.id,
      name: a.name || a.title,
      thumbnail: thumbFromAttraction(a),
      // pass through anything else you need
      destinationId: a.destinationId ?? null,
      category: a.category ?? null
    }));

    res.status(200).json({ items, raw: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
