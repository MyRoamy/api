// Helper to call Viator with correct headers & error handling
const BASE_URL = process.env.VIATOR_BASE_URL || "https://api.sandbox.viator.com/partner";
const API_VERSION = process.env.VIATOR_API_VERSION || "2.0"; // required in Accept
const API_KEY_HEADER = process.env.VIATOR_API_KEY_HEADER || "exp-api-key"; // matches your docs
const API_KEY = process.env.VIATOR_API_KEY;

export async function viator(path, { method = "GET", language = "en-US", body, query } = {}) {
  if (!API_KEY) throw new Error("Missing VIATOR_API_KEY");
  const qs = query ? "?" + new URLSearchParams(query).toString() : "";
  const url = `${BASE_URL}${path}${qs}`;
  const headers = {
    "Accept": `application/json;version=${API_VERSION}`,
    "Accept-Language": language,
    [API_KEY_HEADER]: API_KEY
  };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

  if (!res.ok) {
    const err = new Error(`Viator ${res.status}`);
    err.status = res.status;
    err.detail = json;
    throw err;
  }
  return json;
}

// Basic CORS
export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
