// Simple in-memory cache (per serverless instance) with TTL
const MEMO = new Map(); // key -> { value, expires }

export function setCache(key, value, ttlMs = 24*60*60*1000) { // default 24h
  MEMO.set(key, { value, expires: Date.now() + ttlMs });
}

export function getCache(key) {
  const hit = MEMO.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { MEMO.delete(key); return null; }
  return hit.value;
}
