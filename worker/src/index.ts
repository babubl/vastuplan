/**
 * VastuPlan AI proxy (Cloudflare Worker): "Ask the architect".
 * Keeps the Gemini key server-side (secret GEMINI_API_KEY), restricts origins and rate-limits per IP.
 *
 * POST /ask  { messages: [{ role, text }], plan: string }   plan = the generated design, summarised by the site
 */
interface Env { GEMINI_API_KEY: string; GEMINI_MODEL?: string; ALLOWED_ORIGINS?: string }

const LIMIT_PER_MIN = 12;
const hits = new Map<string, { n: number; t: number }>();

const SYSTEM = `You are the senior residential architect and Vastu consultant behind VastuPlan, an Indian home-planning website.
The user is looking at a concept floor plan the website generated for their plot. The PLAN section below describes it exactly (rooms, sizes in feet, Vastu zones, scores, checks).
Rules:
1. Ground every statement about the house in the PLAN. Refer to rooms by their names and sizes. Never invent rooms or dimensions.
2. Explain Vastu as traditional guidance, not science, respectfully and practically. When a guideline conflicts with light, ventilation, safety or budget, say so and suggest a sensible compromise.
3. You may suggest changes (swap rooms, resize, add a window) and explain the trade-off in Vastu and livability.
4. Costs: give only broad, clearly labelled indicative ranges if asked, and say local rates vary.
5. This is a concept plan. For construction, a licensed architect must prepare approval drawings and a structural engineer must design the structure. Mention this briefly when the user is about to act on the plan.
6. Plain, warm English. Under 170 words. Short bullets when listing.`;

function cors(origin: string | null, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && (allowed.length === 0 || allowed.includes(origin));
  return { "Access-Control-Allow-Origin": ok ? origin! : allowed[0] ?? "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}
const json = (body: unknown, status: number, headers: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cors(req.headers.get("Origin"), env);
    if (req.method === "OPTIONS") return new Response(null, { headers: h });
    if (req.method !== "POST" || !new URL(req.url).pathname.endsWith("/ask")) return json({ error: "not found" }, 404, h);
    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const origin = req.headers.get("Origin");
    if (allowed.length && (!origin || !allowed.includes(origin))) return json({ error: "origin" }, 403, h);
    const ip = req.headers.get("CF-Connecting-IP") ?? "anon";
    const now = Date.now(), rec = hits.get(ip);
    if (rec && now - rec.t < 60_000) { if (++rec.n > LIMIT_PER_MIN) return json({ error: "rate" }, 429, h); } else hits.set(ip, { n: 1, t: now });
    try {
      const { messages, plan } = (await req.json()) as { messages: { role: string; text: string }[]; plan: string };
      if (!Array.isArray(messages) || !messages.length) return json({ error: "bad request" }, 400, h);
      const contents = messages.slice(-10).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: String(m.text).slice(0, 2000) }] }));
      const model = env.GEMINI_MODEL ?? "gemini-flash-latest";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({ system_instruction: { parts: [{ text: `${SYSTEM}\n\nPLAN:\n${String(plan).slice(0, 8000)}` }] }, contents, generationConfig: { temperature: 0.4, maxOutputTokens: 900 } }),
      });
      if (!res.ok) return json({ error: "upstream" }, 502, h);
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
      return text ? json({ text }, 200, h) : json({ error: "empty" }, 502, h);
    } catch { return json({ error: "upstream" }, 502, h); }
  },
};
