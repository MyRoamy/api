import { viator, setCors } from "./_viator";
export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);
    const { lang = "en-US" } = req.query;
    const refs = Array.isArray(req.body?.refs) ? req.body.refs : [];
    if (!refs.length) return res.status(400).json({ error: "Provide refs: string[] in body" });
    const data = await viator("/locations/bulk", { method: "POST", language: lang, body: { locations: refs.map(ref => ({ ref })) } });
    res.status(200).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
