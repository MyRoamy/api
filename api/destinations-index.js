import { viator, setCors } from "./_viator";
import { getCache, setCache } from "./_cache";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);
    const { lang = "en-US", q } = req.query;

    // Load from cache or Viator
    let index = getCache(`destinations:${lang}`);
    if (!index) {
      const data = await viator("/destinations", { language: lang });
      const list = data?.destinations || data || [];
      // compact index (id, name, type, parent, country if present)
      index = list.map(d => ({
        id: d.destinationId || d.id,
        name: d.name,
        type: d.type,
        parentDestinationId: d.parentDestinationId ?? null,
        country: d.country || null,
        region: d.region || null,
        lookupId: d.lookupId || null
      }));
      setCache(`destinations:${lang}`, index, 24*60*60*1000); // 24h TTL
    }

    // optional filtering at the edge
    let results = index;
    if (q && q.trim()) {
      const norm = q.trim().toLowerCase();
      results = index.filter(d =>
        String(d.name||"").toLowerCase().includes(norm) ||
        String(d.country||"").toLowerCase().includes(norm) ||
        String(d.region||"").toLowerCase().includes(norm)
      ).slice(0, 50);
    }

    res.status(200).json({ count: results.length, destinations: results });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
