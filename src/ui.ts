import { PORTAL_CONFIG } from "./config";
import { escapeHtml } from "./render";
import type { DriveFile, SessionUser } from "./types";

const css = `
:root{--accent:${PORTAL_CONFIG.accentColor};--bg:#09070f;--panel:#151020;--panel2:#1d162b;--text:#f6f2ff;--muted:#aaa0bc;--line:#31253f;--danger:#f87171;color-scheme:dark}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 80% -20%,#3b1767 0,transparent 36rem),radial-gradient(circle at 0 30%,#1c1330 0,transparent 28rem),var(--bg);min-height:100vh}
a{color:#c4a8ff}button,.button{appearance:none;border:0;border-radius:12px;background:var(--accent);color:white;font-weight:750;padding:.8rem 1.05rem;text-decoration:none;cursor:pointer;display:inline-flex;gap:.55rem;align-items:center;justify-content:center}
.button.secondary{background:transparent;border:1px solid var(--line);color:var(--text)}button:hover,.button:hover{filter:brightness(1.12)}
.shell{width:min(1120px,calc(100% - 32px));margin:auto}.nav{height:72px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08)}.brand{display:flex;gap:.75rem;align-items:center;color:var(--text);text-decoration:none;font-weight:800;letter-spacing:.01em}.mark{width:35px;height:35px;border:1px solid #9f7aea;border-radius:50%;display:grid;place-items:center;box-shadow:0 0 24px #7c3aed66}.nav-right{display:flex;align-items:center;gap:.8rem}.identity{color:var(--muted);font-size:.9rem}.logout{padding:.5rem .75rem;font-size:.85rem}
main{padding:54px 0 80px}.hero{max-width:760px;padding:52px 0 36px}.eyebrow{color:#b99af5;text-transform:uppercase;letter-spacing:.18em;font-size:.73rem;font-weight:800}.hero h1{font-family:Georgia,serif;font-size:clamp(2.7rem,7vw,5.8rem);line-height:.96;margin:.35em 0 .25em;letter-spacing:-.055em}.hero p{color:var(--muted);font-size:1.13rem;line-height:1.65;max-width:650px}.hero-actions{display:flex;gap:.75rem;margin-top:1.8rem;flex-wrap:wrap}
.login-card{margin:10vh auto 0;width:min(560px,100%);padding:48px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(145deg,#1b1328ee,#100c18ee);box-shadow:0 30px 100px #0008}.login-card .mark{width:54px;height:54px;font-size:1.4rem}.login-card h1{font-family:Georgia,serif;font-size:2.5rem;margin:.65em 0 .25em}.login-card p{color:var(--muted);line-height:1.6}.login-card .button{width:100%;margin-top:1.2rem;padding:1rem}
.toolbar{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:24px}.toolbar h1{font-family:Georgia,serif;font-size:2.2rem;margin:.2rem 0}.search{width:min(360px,100%);padding:.85rem 1rem;border-radius:12px;border:1px solid var(--line);background:#0f0b16;color:var(--text);outline:none}.search:focus{border-color:var(--accent);box-shadow:0 0 0 3px #8b5cf633}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}.card{display:block;min-height:175px;border:1px solid var(--line);border-radius:18px;padding:22px;text-decoration:none;color:var(--text);background:linear-gradient(145deg,#1b1425,#110d18);transition:transform .16s,border-color .16s}.card:hover{transform:translateY(-3px);border-color:#7957a4}.card .icon{font-size:1.5rem}.card h2{font-size:1.05rem;margin:1.1rem 0 .45rem}.card p,.meta,.empty{color:var(--muted);font-size:.88rem;line-height:1.5}.card.featured{border-color:#694892}.badge{display:inline-block;color:#cbb5f5;background:#4c287355;border:1px solid #65408b;padding:.18rem .5rem;border-radius:99px;font-size:.68rem;margin-left:.4rem}
.breadcrumb{display:flex;gap:.5rem;align-items:center;color:var(--muted);font-size:.85rem;margin-bottom:18px}.breadcrumb a{text-decoration:none}.pdf-shell{height:calc(100vh - 190px);min-height:620px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#525659;box-shadow:0 30px 100px #0007}.pdf-viewer{display:block;width:100%;height:100%;border:0;background:#525659}.pdf-fallback{padding:24px}.document{max-width:900px;margin:auto;background:#fdfcff;color:#231d2a;border-radius:18px;padding:clamp(24px,6vw,72px);box-shadow:0 30px 100px #0007}.document h1,.document h2,.document h3,.document h4,.document h5,.document h6{font-family:Georgia,serif;line-height:1.2;color:#1e1726}.document h1{font-size:2.45rem}.document h2{font-size:1.75rem;margin-top:2em}.document h3{font-size:1.35rem;margin-top:1.7em}.document p,.document .list-item{line-height:1.75}.document a{color:#6842a0}.doc-subtitle{font-size:1.2rem;color:#746b7d}.doc-spacer{height:.9rem}.list-item{display:flex;gap:.7rem}.list-item.level-1{padding-left:1.5rem}.list-item.level-2{padding-left:3rem}.list-item.level-3{padding-left:4.5rem}.list-item.level-4{padding-left:6rem}.list-item.level-5{padding-left:7.5rem}.bullet{color:#7650a8}.doc-image{max-width:100%;height:auto;border-radius:8px}.document hr{border:0;border-top:1px solid #ded8e5;margin:2rem 0}.table-scroll{overflow:auto;margin:1.5rem 0}.document table{border-collapse:collapse;width:100%}.document td{border:1px solid #d9d2df;padding:.65rem;vertical-align:top}.person{color:#6842a0;background:#eee8f7;border-radius:4px;padding:0 .2rem}
.notice{border:1px solid var(--line);border-radius:16px;padding:20px;background:var(--panel);color:var(--muted)}.error{color:var(--danger)}footer{border-top:1px solid rgba(255,255,255,.08);padding:28px 0 45px;color:var(--muted);font-size:.8rem}
@media(max-width:650px){.identity{display:none}.toolbar{align-items:stretch;flex-direction:column}.login-card{padding:30px;margin-top:5vh}.document{border-radius:12px}.nav{height:64px}.pdf-shell{height:calc(100vh - 150px);min-height:520px;border-radius:8px}main{padding-top:24px}}
`;

function layout(title: string, body: string, user?: SessionUser): string {
  const display = user ? escapeHtml(user.globalName ?? user.username) : "";
  const nav = user
    ? `<div class="nav-right"><span class="identity">Signed in as ${display}</span><form method="post" action="/logout"><button class="button secondary logout" type="submit">Sign out</button></form></div>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#09070f">
<title>${escapeHtml(title)} · ${escapeHtml(PORTAL_CONFIG.brandName)}</title><style>${css}</style></head>
<body><header class="shell nav"><a class="brand" href="/"><span class="mark">✦</span><span>${escapeHtml(PORTAL_CONFIG.brandName)}</span></a>${nav}</header>
<main class="shell">${body}</main><footer><div class="shell">Private archive · Access verified through Discord</div></footer></body></html>`;
}

export function loginPage(reason?: string): string {
  const message = reason === "membership"
    ? '<p class="error">Your Discord account is not currently permitted to enter this archive.</p>'
    : reason === "auth"
      ? '<p class="error">Discord authentication could not be completed. Please try again.</p>'
      : `<p>${escapeHtml(PORTAL_CONFIG.description)}</p>`;
  return layout("Sign in", `<section class="login-card"><div class="mark">✦</div><div class="eyebrow">${escapeHtml(PORTAL_CONFIG.eyebrow)}</div><h1>${escapeHtml(PORTAL_CONFIG.brandName)}</h1>${message}<a class="button" href="/login">Continue with Discord</a></section>`);
}

function formatDate(value?: string): string {
  if (!value) return "Live document";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Live document"
    : `Updated ${new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(date)}`;
}

export function portalPage(user: SessionUser, files: DriveFile[]): string {
  const featured = new Set(PORTAL_CONFIG.featuredDocumentIds);
  const sorted = [...files].sort((a, b) => {
    const priority = Number(featured.has(b.id)) - Number(featured.has(a.id));
    return priority || a.name.localeCompare(b.name);
  });
  const cards = sorted.map((file) => `<a class="card${featured.has(file.id) ? " featured" : ""}" href="/docs/${encodeURIComponent(file.id)}" data-title="${escapeHtml(file.name.toLowerCase())}">
<span class="icon">◈</span><h2>${escapeHtml(file.name)}${featured.has(file.id) ? '<span class="badge">Featured</span>' : ""}</h2>
<p>${escapeHtml(file.description ?? "Open this record in the secure reader.")}</p><div class="meta">${escapeHtml(formatDate(file.modifiedTime))}</div></a>`).join("");
  const content = cards || '<div class="notice">No Google Docs were found in the configured Drive folder.</div>';
  const script = `<script>const q=document.querySelector('#search');q?.addEventListener('input',()=>{const v=q.value.toLowerCase().trim();document.querySelectorAll('[data-title]').forEach(x=>x.style.display=x.dataset.title.includes(v)?'block':'none')})</script>`;
  return layout("Archive", `<section class="hero"><div class="eyebrow">${escapeHtml(PORTAL_CONFIG.eyebrow)}</div><h1>Knowledge, kept within the order.</h1><p>${escapeHtml(PORTAL_CONFIG.description)}</p></section>
<section><div class="toolbar"><div><div class="eyebrow">${files.length} records</div><h1>Archive</h1></div><input id="search" class="search" type="search" placeholder="Search documents…" aria-label="Search documents"></div><div class="grid">${content}</div></section>${script}`, user);
}

export function documentPage(user: SessionUser, file: DriveFile): string {
  const pdfUrl = `/api/pdf/${encodeURIComponent(file.id)}#view=FitH`;
  return layout(file.name, `<nav class="breadcrumb"><a href="/">Archive</a><span>›</span><span>${escapeHtml(file.name)}</span></nav><section class="pdf-shell"><iframe class="pdf-viewer" src="${pdfUrl}" title="${escapeHtml(file.name)}"></iframe><noscript><p class="pdf-fallback"><a class="button" href="/api/pdf/${encodeURIComponent(file.id)}">Open document</a></p></noscript></section>`, user);
}

export function errorPage(title: string, message: string, status = 500): Response {
  return new Response(layout(title, `<section class="login-card"><div class="eyebrow">Error ${status}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a class="button secondary" href="/">Return to archive</a></section>`), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
