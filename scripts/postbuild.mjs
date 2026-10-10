// After `vite build`: give every route its own HTML (title, description, link previews),
// plus 404.html for client routing on GitHub Pages, sitemap.xml and robots.txt.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SITE = (process.env.VITE_SITE_URL || "https://babubl.github.io/vastuplan").replace(/\/$/, "");
const html = readFileSync("dist/index.html", "utf8");

const ROUTES = [
  ["", "VastuPlan · Vastu-aligned house plans for your plot", "Enter your plot size and facing. Get three Vastu-aligned floor plans with furniture, a 3D walk-through, the reason behind every Vastu rule, and build estimates. Free."],
  ["design", "Design a house · VastuPlan", "Generate Vastu-aligned floor plans for your plot: any size, any facing, 1 to 4 BHK, ground or G+1, corner plots and courtyards. Plan, axonometric and 3D views."],
  ["apartment", "Check an apartment's Vastu · VastuPlan", "Check a flat's Vastu before you buy: entrance, kitchen, master bedroom and pooja zones, with practical fixes when a rule can't be met."],
  ["corners", "A working guide to Vastu · VastuPlan", "The nine Vastu zones and four corners, with the reason behind each rule. North-east or north-west: which corner stays light and sacred?"],
  ["method", "How the plans are made · VastuPlan", "How VastuPlan lays out a house: setbacks, bands, Vastu zones, entrance padas and National Building Code 2016 room sizes."],
  ["legal", "Terms of use and privacy · VastuPlan", "VastuPlan's terms of use and privacy notice. Concept plans only; your plot details stay in your browser."],
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function page(path, title, desc) {
  const url = `${SITE}/${path ? path + "/" : ""}`;
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="VastuPlan" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}/og.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${SITE}/og.png" />`,
  ].join("\n    ");
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace(/\s*<meta name="description"[^>]*>/, "")
    .replace(/\s*<meta property="og:[^>]*>/g, "")
    .replace("</head>", `    ${head}\n  </head>`);
}

for (const [path, title, desc] of ROUTES) {
  const dir = path ? `dist/${path}` : "dist";
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, page(path, title, desc));
}
writeFileSync("dist/404.html", page("", ROUTES[0][1], ROUTES[0][2]).replace("<head>", '<head>\n    <meta name="robots" content="noindex" />'));
const today = new Date().toISOString().slice(0, 10);
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ROUTES.map(([p]) => `  <url><loc>${SITE}/${p ? p + "/" : ""}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`postbuild: ${ROUTES.length} pages, sitemap and robots for ${SITE}`);
