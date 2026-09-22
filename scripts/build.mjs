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

import { emphasisLineChart, lineLegend, dataTable } from "./chart.mjs";
import { loadMarketShare, TOP_N } from "./market-share.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");

const TITLE = "Bentley's Real Estate — Listing Presentation";

/* Charts are rendered here, at build time, and substituted into the page.
   Doing it in the browser would race the headless-Chrome print snapshot. */
async function buildCharts() {
  const pct = (n) => `${Number(n).toFixed(n % 1 === 0 ? 0 : 2)}%`;

  const { years, series } = await loadMarketShare();
  const subject = series.find((s) => s.subject);

  const svg = emphasisLineChart(series, years, {
    format: pct,
    axisFormat: (n) => `${n}%`,
    // Taller than wide-screen proportions: the plate is a book page, and a
    // 2:1 chart floats in a pool of empty cream. Extra height also opens up
    // the crossings in the middle of the field.
    height: 720,
  });

  const table = dataTable(
    years.map((y, i) => ({ label: y, value: subject.values[i] ?? 0 })),
    {
      format: pct,
      caption: `Bentley's market share, Greater Newburyport, and the ${TOP_N - 1} largest competing brokerages`,
      valueHead: "Bentley's share",
    },
  );

  return { "market-share": svg + "\n" + lineLegend(series) + "\n" + table };
}

async function readPages(charts) {
  const dir = join(SRC, "pages");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".html")).sort();
  if (!files.length) throw new Error("no pages found in src/pages");

  const pages = [];
  for (const f of files) {
    let html = (await readFile(join(dir, f), "utf8")).trim();
    html = html.replace(/<!--CHART:([\w-]+)-->/g, (_, name) => {
      if (!(name in charts)) throw new Error(`${f}: unknown chart "${name}"`);
      return charts[name];
    });
    pages.push(html);
  }
  return { files, pages };
}

/* Styles are inlined rather than linked so a page opened straight off disk —
   file:// with no server — renders correctly. Chrome's PDF renderer reads it
   the same way. */
async function readStyles(forPrint) {
  const names = ["fonts.css", "tokens.css", "book.css", "chart.css", "pages.css", "pages-b.css"];
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

/* ----- flipbook shell (screen only; never part of the print build) -----

   Pages are authored at a true 8.5 x 11in. StPageFlip's own "stretch" sizing
   would overwrite those dimensions and collapse the page grids, so the book
   is built at full size and the whole stage is scaled to fit instead. */
body.is-flip {
  background: #2b2f38;
  min-height: 100vh;
  margin: 0;
  overflow: hidden;
}
#stage {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* Must not shrink: it is a flex item, and letting it collapse to the
   available width breaks the page aspect ratio before the transform is even
   applied. The transform does the fitting, not the flex layout. */
#scaler { flex: 0 0 auto; transform-origin: center center; }
#book .page { box-shadow: 0 18px 46px rgba(0, 0, 0, 0.42); }
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

<div id="stage">
  <div id="scaler">
    <div id="book">
${pages.join("\n\n")}
    </div>
  </div>
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
  var scaler = document.getElementById('scaler');

  // Pages are authored in inches. Measure what that is in CSS pixels rather
  // than assuming 96dpi.
  var first = el.querySelector('.page');
  var probe = first.getBoundingClientRect();
  var PW = Math.round(probe.width), PH = Math.round(probe.height);

  // A pristine copy, because loadFromHTML consumes the nodes it is given and
  // the book is rebuilt when the layout crosses the breakpoint.
  var SOURCE = Array.prototype.map.call(el.querySelectorAll('.page'), function (p) {
    return p.cloneNode(true);
  });

  // Below this the two pages of a spread are too small to read, so a phone
  // gets one page at a time instead.
  var SPREAD_MIN = 820;
  var wantsSpread = function () { return window.innerWidth >= SPREAD_MIN; };

  var flip = null;
  var spread = null;

  function fit() {
    var bw = PW * (spread ? 2 : 1), bh = PH;
    var pad = 64; // room for the nav pill
    var s = Math.min((window.innerWidth - 32) / bw, (window.innerHeight - pad) / bh, 1);
    scaler.style.width = bw + 'px';
    scaler.style.height = bh + 'px';
    scaler.style.transform = 'scale(' + s + ')';
  }

  var cur = document.getElementById('cur');
  var total = document.getElementById('total');
  var prev = document.getElementById('prev');
  var next = document.getElementById('next');

  function sync() {
    if (!flip) return;
    var i = flip.getCurrentPageIndex();
    var n = flip.getPageCount();
    // In a spread the reader is looking at two leaves at once, so the counter
    // names both rather than pretending one is showing.
    var right = spread && i > 0 && i < n - 1 ? i + 2 : 0;
    cur.textContent = right ? (i + 1) + '\\u2013' + right : (i + 1);
    total.textContent = n;
    prev.disabled = i <= 0;
    next.disabled = i >= n - 1;
  }

  function build(startIndex) {
    if (flip) { try { flip.destroy(); } catch (e) {} }
    spread = wantsSpread();

    // The library decides portrait vs landscape from the width available to
    // it, so the container has to be two pages wide BEFORE init or it will
    // always choose a single page. The transform does the fitting afterwards.
    scaler.style.width = (PW * (spread ? 2 : 1)) + 'px';
    scaler.style.height = PH + 'px';

    el.innerHTML = '';
    var fresh = SOURCE.map(function (p) { return p.cloneNode(true); });
    fresh.forEach(function (p) { el.appendChild(p); });

    flip = new St.PageFlip(el, {
      width: PW,
      height: PH,
      size: 'fixed',
      maxShadowOpacity: 0.5,
      showCover: true,          // the cover stands alone, as a real cover does
      usePortrait: !spread,
      mobileScrollSupport: true,
      drawShadow: true
    });

    flip.loadFromHTML(fresh);
    flip.on('flip', function () { sync(); hideTip(); });

    if (startIndex) {
      try { flip.turnToPage(startIndex); } catch (e) {}
    }
    fit();
    sync();
  }

  prev.addEventListener('click', function () { if (flip) flip.flipPrev(); });
  next.addEventListener('click', function () { if (flip) flip.flipNext(); });
  document.addEventListener('keydown', function (e) {
    if (!flip) return;
    if (e.key === 'ArrowLeft') flip.flipPrev();
    if (e.key === 'ArrowRight') flip.flipNext();
  });

  // Only a rebuild changes single-page to spread; every other resize is just
  // a rescale, which is cheap.
  window.addEventListener('resize', function () {
    if (wantsSpread() !== spread) build(flip ? flip.getCurrentPageIndex() : 0);
    else fit();
  });

  // ----- chart hover layer -------------------------------------------------
  // The marks are baked into the SVG at build time; this only adds the
  // readout. Everything it shows is also in the chart's table view, so the
  // tooltip enhances and never gates. Delegated, because the flip library
  // moves pages around in the DOM.
  var tip = document.createElement('div');
  tip.className = 'chart__tip';
  tip.setAttribute('role', 'status');
  var tipLabel = document.createElement('span');
  tipLabel.className = 'chart__tip-label';
  var tipBody = document.createElement('div');
  tipBody.className = 'chart__tip-body';
  tip.appendChild(tipLabel);
  tip.appendChild(tipBody);
  document.body.appendChild(tip);

  // Names come from a data file — rows are built with textContent, never by
  // concatenating HTML.
  function tipRow(name, value, subject) {
    var r = document.createElement('div');
    r.className = 'chart__tip-row' + (subject ? ' is-subject' : '');
    var n = document.createElement('span');
    n.className = 'chart__tip-name';
    n.textContent = name;
    var v = document.createElement('span');
    v.className = 'chart__tip-num';
    v.textContent = value;
    r.appendChild(n);
    r.appendChild(v);
    return r;
  }

  function showTip(col) {
    tipLabel.textContent = col.getAttribute('data-label') || '';
    tipBody.textContent = '';

    // A line chart carries every series at this X; a column chart carries one
    // value. One readout handles both.
    var raw = col.getAttribute('data-rows');
    if (raw) {
      var rows = [];
      try { rows = JSON.parse(raw); } catch (e) { rows = []; }
      for (var i = 0; i < rows.length; i++) {
        tipBody.appendChild(tipRow(rows[i].n, rows[i].v, rows[i].s));
      }
    } else {
      tipBody.appendChild(tipRow('', col.getAttribute('data-value') || '', true));
    }

    var mark = col.querySelector('.chart__bar') || col.querySelector('.chart__crosshair') || col;
    var r = mark.getBoundingClientRect();
    tip.style.left = (r.left + r.width / 2) + 'px';
    tip.style.top = r.top + 'px';
    tip.setAttribute('data-show', 'true');

    var prev = document.querySelector('.chart__crosshair[data-on="true"]');
    if (prev) prev.removeAttribute('data-on');
    var cross = col.querySelector('.chart__crosshair');
    if (cross) cross.setAttribute('data-on', 'true');
  }

  function hideTip() {
    tip.setAttribute('data-show', 'false');
    var on = document.querySelectorAll('.chart__crosshair[data-on="true"]');
    for (var i = 0; i < on.length; i++) on[i].removeAttribute('data-on');
  }

  document.addEventListener('pointermove', function (e) {
    var col = e.target.closest && e.target.closest('.chart__col');
    if (col) showTip(col); else hideTip();
  });
  document.addEventListener('focusin', function (e) {
    var col = e.target.closest && e.target.closest('.chart__col');
    if (col) showTip(col);
  });
  document.addEventListener('focusout', hideTip);
  window.addEventListener('scroll', hideTip, true);

  // Built last, so the tooltip it hides on every flip already exists.
  build(0);
})();
</script>
</body>
</html>
`;
}

async function main() {
  const { files, pages } = await readPages(await buildCharts());

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
