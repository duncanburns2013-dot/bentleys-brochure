/* ---------------------------------------------------------------------------
   Assembles src/pages/*.html into the two deliverables:

     dist/print.html  — every page, one after another, for the PDF render
     dist/index.html  — the same pages inside the flipbook, for GitHub Pages

   Pages are authored once. Neither output is allowed to restate their markup,
   which is the whole reason print and web cannot drift apart.
--------------------------------------------------------------------------- */

import { readdir, readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");

const TITLE = "Bentley's Real Estate — Listing Presentation";

async function readPages() {
  const dir = join(SRC, "pages");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".html")).sort();
  if (!files.length) throw new Error("no pages found in src/pages");
  const pages = [];
  for (const f of files) pages.push((await readFile(join(dir, f), "utf8")).trim());
  return { files, pages };
}

/* Styles are inlined rather than linked so a page opened straight off disk —
   file:// with no server — renders correctly. Chrome's PDF renderer reads it
   the same way. */
async function readStyles(forPrint) {
  const names = ["fonts.css", "tokens.css", "book.css", "pages.css"];
  if (forPrint) names.push("print.css");
  const parts = [];
  for (const n of names) {
    let css = await readFile(join(SRC, "styles", n), "utf8");
    // Sheets live in src/styles/; the outputs live in dist/. Rewrite asset
    // paths to match, keeping one authoritative copy of each sheet.
    css = css.replaceAll("../assets/", "assets/");
    parts.push(`/* ===== ${n} ===== */\n${css}`);
  }
  return parts.join("\n\n");
}

function printDoc(css, pages) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${TITLE} — print</title>
<style>
${css}
</style>
</head>
<body class="is-print">
${pages.join("\n\n")}
</body>
</html>
`;
}

function flipDoc(css, pages) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="Bentley's Real Estate — the #1 brokerage in Greater Newburyport, seven years running.">
<style>
${css}

/* ----- flipbook shell (screen only; never part of the print build) ----- */
body.is-flip {
  background: #2b2f38;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}
#book { --page-scale: 1; }
#book .page {
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.42);
  background: var(--cream);
}
.flip-nav {
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 16px;
  border-radius: 999px;
  background: rgba(15, 18, 24, 0.82);
  backdrop-filter: blur(8px);
  font-family: var(--font-sans);
  font-size: 12px;
  color: #f7f5ee;
}
.flip-nav button {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.flip-nav button:hover { background: rgba(255, 255, 255, 0.12); }
.flip-nav button:disabled { opacity: 0.35; cursor: default; }
.flip-nav__count { letter-spacing: 0.08em; min-width: 68px; text-align: center; }
</style>
</head>
<body class="is-flip">

<div id="book">
${pages.join("\n\n")}
</div>

<nav class="flip-nav" aria-label="Page navigation">
  <button id="prev" type="button" aria-label="Previous page">&larr; Prev</button>
  <span class="flip-nav__count"><span id="cur">1</span> / <span id="total">${pages.length}</span></span>
  <button id="next" type="button" aria-label="Next page">Next &rarr;</button>
</nav>

<script src="assets/page-flip.browser.js"></script>
<script>
(function () {
  var el = document.getElementById('book');
  var pages = Array.prototype.slice.call(el.querySelectorAll('.page'));

  // Pages are authored in inches. Ask the browser what that is in CSS pixels
  // rather than assuming 96dpi.
  var probe = pages[0].getBoundingClientRect();
  var PW = Math.round(probe.width), PH = Math.round(probe.height);

  var flip = new St.PageFlip(el, {
    width: PW,
    height: PH,
    size: 'stretch',
    minWidth: 240,
    maxWidth: PW,
    minHeight: 320,
    maxHeight: PH,
    maxShadowOpacity: 0.5,
    showCover: true,
    mobileScrollSupport: true,
    usePortrait: true
  });

  flip.loadFromHTML(pages);

  var cur = document.getElementById('cur');
  var prev = document.getElementById('prev');
  var next = document.getElementById('next');

  function sync() {
    var i = flip.getCurrentPageIndex();
    cur.textContent = i + 1;
    prev.disabled = i <= 0;
    next.disabled = i >= flip.getPageCount() - 1;
  }
  flip.on('flip', sync);
  prev.addEventListener('click', function () { flip.flipPrev(); });
  next.addEventListener('click', function () { flip.flipNext(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') flip.flipPrev();
    if (e.key === 'ArrowRight') flip.flipNext();
  });
  sync();
})();
</script>
</body>
</html>
`;
}

async function main() {
  const { files, pages } = await readPages();

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  await writeFile(join(DIST, "print.html"), printDoc(await readStyles(true), pages));
  await writeFile(join(DIST, "index.html"), flipDoc(await readStyles(false), pages));
  await cp(join(ROOT, "assets"), join(DIST, "assets"), { recursive: true });

  console.log(`built ${pages.length} page(s): ${files.join(", ")}`);
  console.log("  dist/print.html  -> PDF source");
  console.log("  dist/index.html  -> flipbook");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
