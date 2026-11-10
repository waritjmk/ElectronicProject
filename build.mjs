// Build: projects/<slug>/ -> docs/downloads/<slug>.zip + docs/index.html
// Run: node build.mjs   (Windows: zips with PowerShell Compress-Archive)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "docs");
const site = JSON.parse(readFileSync(join(root, "site.json"), "utf8"));
const css = readFileSync(join(root, "src/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const t = (s) => esc(s).replace(/\[TODO:[^\]]*\]/g, (m) => `<span class="todo">${m}</span>`);

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
// Warn about things that should never be published (Wi-Fi passwords, keys, tokens)
const SECRET = /(ssid|password|passwd|api[_-]?key|token|secret)\s*(\[\])?\s*[:=]\s*["'](?!YOUR_|your_|xxx|\*|<)[^"']{4,}["']/i;

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "downloads"), { recursive: true });
writeFileSync(join(out, ".nojekyll"), "");

const projectsDir = join(root, "projects");
const slugs = readdirSync(projectsDir).filter((n) => !n.startsWith("_") && statSync(join(projectsDir, n)).isDirectory()).sort();
const projects = [];
for (const slug of slugs) {
  const dir = join(projectsDir, slug);
  const metaPath = join(dir, "project.json");
  if (!existsSync(metaPath)) { console.warn(`skip ${slug}: no project.json`); continue; }
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const files = walk(dir);
  for (const f of files) {
    if (statSync(f).size > 2e6) continue;
    const hit = readFileSync(f, "utf8").split(/\r?\n/).findIndex((l) => SECRET.test(l));
    if (hit >= 0) console.warn(`!! possible secret in ${relative(root, f)} line ${hit + 1}. Remove it before pushing.`);
  }
  const zip = join(out, "downloads", `${slug}.zip`);
  execFileSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${join(dir, "*")}' -DestinationPath '${zip}' -Force`]);
  projects.push({ slug, ...meta, count: files.length, kb: Math.max(1, Math.round(statSync(zip).size / 1024)) });
  console.log(`${slug}: ${files.length} files -> docs/downloads/${slug}.zip`);
}

const card = (p) => `<article class="card">
  <p class="mono">${esc(p.slug)}</p>
  <h2>${t(p.title)}</h2>
  <p>${t(p.desc)}</p>
  ${p.tags?.length ? `<ul class="tags">${p.tags.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
  <div class="btns">
    <a class="btn btn--solid" href="downloads/${esc(p.slug)}.zip" download>ดาวน์โหลด ZIP <span class="mono">${p.kb} KB</span></a>
    ${site.repo ? `<a class="btn" href="${esc(site.repo)}/tree/main/projects/${esc(p.slug)}" target="_blank" rel="noopener">ดูโค้ดบน GitHub<span class="vh"> (เปิดแท็บใหม่)</span></a>` : ""}
    ${p.video ? `<a class="btn" href="${esc(p.video)}" target="_blank" rel="noopener">ดูคลิป<span class="vh"> (เปิดแท็บใหม่)</span></a>` : ""}
  </div>
</article>`;

const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.title)}</title>
<meta name="description" content="${esc(site.description)}">
<meta name="theme-color" content="#0B1220">
${site.url ? `<link rel="canonical" href="${esc(site.url)}/">` : ""}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(site.title)}">
<meta property="og:description" content="${esc(site.description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans+Thai:wght@400;600&amp;display=swap" media="print" onload="this.media='all'">
<style>${css}</style>
</head>
<body>
<a class="skip" href="#main">ข้ามไปที่เนื้อหา</a>
<header class="top"><div class="wrap">
  <a class="brand" href="./">${esc(site.brand)}</a>
  ${site.home ? `<a class="navlink" href="${esc(site.home)}">เว็บหลัก EasyEngineer</a>` : ""}
</div></header>
<main id="main" class="wrap">
  <p class="mono">FREE CODE · ${projects.length} PROJECT${projects.length === 1 ? "" : "S"}</p>
  <h1>${t(site.heading)}</h1>
  <p class="lead">${t(site.lead)}</p>
  ${projects.length
    ? `<div class="grid">${projects.map(card).join("")}</div>`
    : `<div class="empty"><p>ยังไม่มีโปรเจกต์ในตอนนี้</p><p class="mono">เพิ่มโฟลเดอร์ใน projects/ แล้วรัน node build.mjs</p></div>`}
  <p class="note">${t(site.license)}</p>
</main>
<footer class="foot"><div class="wrap">© ${new Date().getFullYear()} ${esc(site.brand)}</div></footer>
</body>
</html>
`;
writeFileSync(join(out, "index.html"), html);
console.log(`docs/index.html  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB  (${projects.length} projects)`);
