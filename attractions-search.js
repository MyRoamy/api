import { viator, setCors } from "./_viator";
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
    const data = await viator("/attractions/search", { method: "POST", language: lang, body: payload });
    res.status(200).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
