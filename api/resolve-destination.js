import { setCors } from "./_viator";
import { getCache, setCache } from "./_cache";
import handlerIndex from "./destinations-index";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  // Reuse the index handler to populate cache if needed
  try {
    setCors(res);
    const { name = "", lang = "en-US" } = req.query;
    if (!name.trim()) return res.status(400).json({ error: "Provide ?name=" });

    // Ensure index cached
    const fakeRes = {
      status: () => fakeRes, json: (v)=>{ fakeRes.body = v; },
      setHeader: () => {}
    };
    await handlerIndex({ method: "GET", query: { lang } }, fakeRes);
    const index = fakeRes.body?.destinations || [];

    const norm = name.trim().toLowerCase();
    const exact = index.find(d => String(d.name||"").toLowerCase() === norm);
    const contains = exact ? null : index.find(d => String(d.name||"").toLowerCase().includes(norm));

    const best = exact || contains || null;
    if (!best) return res.status(404).json({ error: `No destination found for "${name}"` });

    res.status(200).json({ destinationId: best.id, match: best });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Resolve error", detail: err.detail || String(err) });
  }
}
