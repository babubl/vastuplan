/**
 * VastuPlan worker (Cloudflare): "Ask the architect" with Gemini, and site feedback.
 * - Keeps the Gemini key server-side (secret GEMINI_API_KEY).
 * - Accepts calls only from the site's origins and rate-limits per IP.
 *
 * POST /ask       { messages: [{ role, text }], plan: string }
 * POST /feedback  { message, rating?, page?, contact?, plan? }      stored in KV (binding FEEDBACK)
 * GET  /feedback?token=…                                            latest entries, needs secret FEEDBACK_ADMIN_TOKEN
 */
interface KV { put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void>; get(k: string): Promise<string | null>; list(o?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }> }
interface Env { GEMINI_API_KEY: string; GEMINI_MODEL?: string; ALLOWED_ORIGINS?: string; FEEDBACK?: KV; FEEDBACK_ADMIN_TOKEN?: string }

const LIMIT_PER_MIN = 12;
const hits = new Map<string, { n: number; t: number }>();

const SYSTEM = `You are the senior residential architect and Vastu consultant behind VastuPlan, an Indian home-planning website.
The user is looking at a concept floor plan the website generated for their plot. The PLAN section describes it exactly: rooms, sizes in feet, Vastu zones, scores and every check with its reasoning.
Rules:
1. Ground every statement about the house in the PLAN. Refer to rooms by name and size. Never invent rooms, sizes or features.
2. Explain Vastu as traditional guidance, respectfully and practically, with its reasoning (element, guardian, sun path). If the user states a Vastu belief that conflicts with the standard texts (for example confusing the north-east with the north-west), correct it gently and explain why.
3. When Vastu conflicts with light, ventilation, safety or budget, say so and suggest a sensible compromise.
4. You may suggest changes (swap rooms, resize, add a window, a courtyard) and explain the trade-off. Mention that the controls on the left of the designer can try many of them.
5. Costs: only broad, clearly labelled indicative ranges, and say local rates vary.
6. This is a concept plan. For construction, a licensed architect must prepare approval drawings and a structural engineer must design the structure; mention this briefly when the user is about to act on it.
7. Plain, warm English (reply in the user's language if they write in another one). Under 180 words. Short bullets when listing.`;

function cors(origin: string | null, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && (allowed.length === 0 || allowed.includes(origin));
  return { "Access-Control-Allow-Origin": ok ? origin! : allowed[0] ?? "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}
const json = (body: unknown, status: number, headers: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

async function ask(req: Request, env: Env, h: Record<string, string>) {
  if (!env.GEMINI_API_KEY) return json({ error: "not configured" }, 503, h);
  const { messages, plan } = (await req.json()) as { messages: { role: string; text: string }[]; plan: string };
  if (!Array.isArray(messages) || !messages.length) return json({ error: "bad request" }, 400, h);
  const contents = messages.slice(-10).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: clip(m.text, 2000) }] }));
  const model = env.GEMINI_MODEL ?? "gemini-flash-latest";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({ system_instruction: { parts: [{ text: `${SYSTEM}\n\nPLAN:\n${clip(plan, 9000)}` }] }, contents, generationConfig: { temperature: 0.4, maxOutputTokens: 900 } }),
  });
  if (!res.ok) return json({ error: "upstream" }, 502, h);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  return text ? json({ text }, 200, h) : json({ error: "empty" }, 502, h);
}

async function feedback(req: Request, env: Env, h: Record<string, string>, ip: string) {
  if (!env.FEEDBACK) return json({ error: "not configured" }, 503, h);
  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("token");
    if (!env.FEEDBACK_ADMIN_TOKEN || token !== env.FEEDBACK_ADMIN_TOKEN) return json({ error: "forbidden" }, 403, h);
    const { keys } = await env.FEEDBACK.list({ prefix: "fb:", limit: 200 });
    const items = await Promise.all(keys.map(async (k) => JSON.parse((await env.FEEDBACK!.get(k.name)) ?? "{}")));
    return json({ items: items.sort((a, b) => String(b.at).localeCompare(String(a.at))) }, 200, h);
  }
  const b = (await req.json()) as Record<string, unknown>;
  const message = clip(b.message, 3000).trim();
  if (message.length < 3) return json({ error: "empty" }, 400, h);
  const at = new Date().toISOString();
  const entry = { at, message, rating: Number(b.rating) || null, page: clip(b.page, 300), contact: clip(b.contact, 200), plan: clip(b.plan, 4000), ipHash: await hash(ip) };
  // reverse-time key so the newest entries list first
  await env.FEEDBACK.put(`fb:${9999999999999 - Date.now()}:${crypto.randomUUID().slice(0, 8)}`, JSON.stringify(entry), { expirationTtl: 60 * 60 * 24 * 365 });
  return json({ ok: true }, 200, h);
}

async function hash(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 6).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cors(req.headers.get("Origin"), env);
    if (req.method === "OPTIONS") return new Response(null, { headers: h });
    const path = new URL(req.url).pathname;
    const ip = req.headers.get("CF-Connecting-IP") ?? "anon";
    if (req.method === "POST") {
      const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      const origin = req.headers.get("Origin");
      if (allowed.length && (!origin || !allowed.includes(origin))) return json({ error: "origin" }, 403, h);
      const now = Date.now(), rec = hits.get(ip);
      if (rec && now - rec.t < 60_000) { if (++rec.n > LIMIT_PER_MIN) return json({ error: "rate" }, 429, h); } else hits.set(ip, { n: 1, t: now });
    }
    try {
      if (path.endsWith("/ask") && req.method === "POST") return await ask(req, env, h);
      if (path.endsWith("/feedback")) return await feedback(req, env, h, ip);
      if (path === "/" || path.endsWith("/health")) return json({ ok: true, ai: !!env.GEMINI_API_KEY, feedback: !!env.FEEDBACK }, 200, h);
      return json({ error: "not found" }, 404, h);
    } catch { return json({ error: "upstream" }, 502, h); }
  },
};
