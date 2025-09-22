import { viator, setCors } from "./_viator";
export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCors(res); return res.status(204).end(); }
  try {
    setCors(res);
    const { lang = "en-US" } = req.query;
    const data = await viator("/destinations", { language: lang });
    res.status(200).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: "Viator error", detail: err.detail || String(err) });
  }
}
