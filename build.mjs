// Build: projects/<slug>/ -> docs/index.html (catalog) + docs/p/<slug>/index.html (project page)
//        + docs/downloads/<slug>.zip
// Run: node build.mjs   (Windows: zips with PowerShell Compress-Archive)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "docs");
const site = JSON.parse(readFileSync(join(root, "site.json"), "utf8"));
const css = readFileSync(join(root, "src/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const t = (s) => esc(s).replace(/\[TODO:[^\]]*\]/g, (m) => `<span class="todo">${m}</span>`);
const IMG = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const NEW = `<span class="vh"> (เปิดแท็บใหม่)</span>`;

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
// Warn about things that should never be published (Wi-Fi passwords, keys, tokens)
const SECRET = /(ssid|password|passwd|api[_-]?key|token|secret)\s*(\[\])?\s*[:=]\s*["'](?!YOUR_|your_|xxx|\*|<)[^"']{4,}["']/i;
const ytId = (v) => (String(v || "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/) || [, /^[\w-]{11}$/.test(v || "") ? v : ""])[1];

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "downloads"), { recursive: true });
mkdirSync(join(out, "assets"), { recursive: true });
writeFileSync(join(out, ".nojekyll"), "");
copyFileSync(join(root, "src/app.js"), join(out, "assets/app.js"));

const head = (title, desc, up, path) => `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0B1220">
${site.url ? `<link rel="canonical" href="${esc(site.url)}/${path}">` : ""}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans+Thai:wght@400;600&amp;display=swap" media="print" onload="this.media='all'">
<style>${css}</style>
<script src="${up}assets/app.js" defer></script>
</head>
<body>
<a class="skip" href="#main">ข้ามไปที่เนื้อหา</a>
<header class="top"><div class="wrap">
  <a class="brand" href="${up}">${esc(site.brand)}</a>
  ${site.home ? `<a class="navlink" href="${esc(site.home)}">เว็บหลัก EasyEngineer</a>` : ""}
</div></header>`;
const foot = `<footer class="foot"><div class="wrap"><span>${t(site.license)}</span><span>© ${new Date().getFullYear()} ${esc(site.brand)}</span></div></footer>
</body>
</html>
`;

const projectsDir = join(root, "projects");
const slugs = readdirSync(projectsDir).filter((n) => !n.startsWith("_") && statSync(join(projectsDir, n)).isDirectory()).sort();
const projects = [];
for (const slug of slugs) {
  const dir = join(projectsDir, slug);
  const metaPath = join(dir, "project.json");
  if (!existsSync(metaPath)) { console.warn(`skip ${slug}: no project.json`); continue; }
  const p = { slug, tags: [], parts: [], steps: [], ...JSON.parse(readFileSync(metaPath, "utf8")) };
  const files = walk(dir);
  for (const f of files) {
    if (statSync(f).size > 2e6 || IMG.has(extname(f).toLowerCase())) continue;
    const hit = readFileSync(f, "utf8").split(/\r?\n/).findIndex((l) => SECRET.test(l));
    if (hit >= 0) console.warn(`!! possible secret in ${relative(root, f)} line ${hit + 1}. Remove it before pushing.`);
  }
  const zip = join(out, "downloads", `${slug}.zip`);
  execFileSync("powershell", ["-NoProfile", "-Command", `Compress-Archive -Path '${join(dir, "*")}' -DestinationPath '${zip}' -Force`]);
  p.kb = Math.max(1, Math.round(statSync(zip).size / 1024));

  // copy images next to the project page
  const pdir = join(out, "p", slug);
  mkdirSync(pdir, { recursive: true });
  const img = (name) => {
    if (!name) return "";
    if (!existsSync(join(dir, name))) { console.warn(`${slug}: image not found: ${name}`); return ""; }
    copyFileSync(join(dir, name), join(pdir, name));
    return name;
  };
  p.cover = img(p.cover);
  const wiring = p.wiring || {};
  wiring.image = img(wiring.image);
  const yt = ytId(p.youtube);
  if (p.youtube && !yt) console.warn(`${slug}: could not read a YouTube id from "${p.youtube}"`);

  let code = "";
  if (p.code?.main) {
    const cp = join(dir, p.code.main);
    if (existsSync(cp) && statSync(cp).size < 80e3) code = readFileSync(cp, "utf8");
    else console.warn(`${slug}: code.main not found or too large to show: ${p.code.main}`);
  }
  const gh = site.repo ? `${site.repo}/tree/main/projects/${slug}` : "";
  const dl = `<a class="btn btn--solid" href="../../downloads/${esc(slug)}.zip" download>ดาวน์โหลดโค้ด (ZIP) <span class="mono">${p.kb} KB</span></a>`;
  const sec = (id, n, title, body) => `<section class="sec" id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h"><span class="num">${n}</span>${title}</h2>${body}</section>`;
  let n = 0;
  const num = () => String(++n).padStart(2, "0");
  const blocks = [];
  if (yt || p.tiktok) blocks.push(sec("video", num(), "คลิป", `
    ${yt ? `<a class="yt" href="https://www.youtube.com/watch?v=${yt}" data-yt="${yt}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" width="480" height="360" loading="lazy" alt="ภาพตัวอย่างคลิป ${esc(p.title)} บน YouTube"><span class="yt__play" aria-hidden="true"></span><span class="vh">เล่นคลิปบน YouTube</span></a>` : ""}
    <div class="btns">${yt ? `<a class="btn" href="https://www.youtube.com/watch?v=${yt}" target="_blank" rel="noopener">ดูบน YouTube${NEW}</a>` : ""}${p.tiktok ? `<a class="btn" href="${esc(p.tiktok)}" target="_blank" rel="noopener">ดูบน TikTok${NEW}</a>` : ""}</div>`));
  if (p.parts.length) blocks.push(sec("parts", num(), "อุปกรณ์ที่ใช้", `
    <div class="tablewrap"><table><thead><tr><th scope="col">อุปกรณ์</th><th scope="col">จำนวน</th><th scope="col">หมายเหตุ</th></tr></thead><tbody>
    ${p.parts.map((x) => `<tr><th scope="row">${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">${t(x.name)}${NEW}</a>` : t(x.name)}</th><td>${t(x.qty ?? "")}</td><td>${t(x.note ?? "")}</td></tr>`).join("")}
    </tbody></table></div>`));
  if (wiring.image || wiring.pins?.length) blocks.push(sec("wiring", num(), "การต่อวงจร", `
    ${wiring.image ? `<a class="figure" href="${esc(wiring.image)}" target="_blank" rel="noopener"><img src="${esc(wiring.image)}" loading="lazy" alt="ผังการต่อวงจรของ ${esc(p.title)}"></a>` : ""}
    ${wiring.pins?.length ? `<div class="tablewrap"><table><thead><tr><th scope="col">จาก</th><th scope="col">ต่อไปที่</th></tr></thead><tbody>${wiring.pins.map(([a, b]) => `<tr><td class="mono">${t(a)}</td><td class="mono">${t(b)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${wiring.note ? `<p class="hint">${t(wiring.note)}</p>` : ""}`));
  blocks.push(sec("code", num(), "Source code", `
    <div class="btns">${dl}${gh ? `<a class="btn" href="${esc(gh)}" target="_blank" rel="noopener">ดูทุกไฟล์บน GitHub${NEW}</a>` : ""}</div>
    ${code ? `<div class="codebox"><div class="codebox__bar"><span class="mono">${esc(p.code.main)}</span><button class="copy" type="button" data-copy>คัดลอกโค้ด</button></div><pre tabindex="0"><code>${esc(code)}</code></pre></div>` : ""}`));
  if (p.steps.length) blocks.push(sec("steps", num(), "ขั้นตอน", `<ol class="steps">${p.steps.map((s) => `<li>${t(s)}</li>`).join("")}</ol>`));

  writeFileSync(join(pdir, "index.html"), `${head(`${p.title} — ${site.brand}`, p.desc, "../../", `p/${slug}/`)}
<main id="main">
  <div class="banner${p.cover ? "" : " banner--plain"}">
    ${p.cover ? `<img src="${esc(p.cover)}" alt="" fetchpriority="high">` : ""}
    <div class="wrap banner__in">
      <p class="mono"><a href="../../">โปรเจกต์ทั้งหมด</a> / ${esc(p.category || "โปรเจกต์")}</p>
      <h1>${t(p.title)}</h1>
      <p class="lead">${t(p.desc)}</p>
      ${p.tags.length ? `<ul class="tags">${p.tags.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      <div class="btns">${dl}${blocks.length > 1 ? `<a class="btn" href="#${yt || p.tiktok ? "video" : "code"}">ดูรายละเอียด</a>` : ""}</div>
    </div>
  </div>
  <div class="wrap">${blocks.join("\n")}</div>
</main>
${foot}`);
  projects.push(p);
  console.log(`${slug}: ${files.length} files, ${p.kb} KB zip -> docs/p/${slug}/`);
}

// ----- catalog, grouped by category -----
const cats = [...new Set(projects.map((p) => p.category || "โปรเจกต์"))];
const card = (p) => `<a class="card" href="p/${esc(p.slug)}/">
  <div class="thumb">${p.cover ? `<img src="p/${esc(p.slug)}/${esc(p.cover)}" loading="lazy" alt="">` : `<span class="mono">${esc(p.slug)}</span>`}</div>
  <div class="card__body"><h3>${t(p.title)}</h3><p>${t(p.desc)}</p>
  <ul class="tags">${[ytId(p.youtube) || p.tiktok ? "คลิป" : "", p.wiring?.image || p.wiring?.pins?.length ? "Wiring" : "", "Source code"].filter(Boolean).concat(p.tags).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
</a>`;
const index = `${head(site.title, site.description, "./", "")}
<main id="main" class="wrap home">
  <p class="mono">FREE CODE · ${projects.length} PROJECT${projects.length === 1 ? "" : "S"}</p>
  <h1>${t(site.heading)}</h1>
  <p class="lead">${t(site.lead)}</p>
  ${projects.length
    ? cats.map((c) => `<section class="cat"><h2>${esc(c)}</h2><div class="grid">${projects.filter((p) => (p.category || "โปรเจกต์") === c).map(card).join("")}</div></section>`).join("")
    : `<div class="empty"><p>ยังไม่มีโปรเจกต์ในตอนนี้</p><p class="mono">เพิ่มโฟลเดอร์ใน projects/ แล้วรัน node build.mjs</p></div>`}
</main>
${foot}`;
writeFileSync(join(out, "index.html"), index);
console.log(`docs/index.html  ${(Buffer.byteLength(index) / 1024).toFixed(1)} KB  (${projects.length} projects)`);
