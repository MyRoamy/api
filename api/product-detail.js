import { viator, setCors } from "./_viator";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);
    const { code, lang = "en-US" } = req.query;
    if (!code) return res.status(400).json({ error: "Missing product code" });

    const data = await viator(`/products/${encodeURIComponent(code)}`, { language: lang });

    // expose key content + productOptions + itinerary (for What to Expect)
    const detail = {
      code: data?.productCode,
      title: data?.title,
      description: data?.description,
      images: data?.photos || [],
      productOptions: data?.productOptions || [],
      itinerary: data?.itinerary || null,
      summary: data?.summary || null
    };

    res.status(200).json({ detail, raw: data });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
