/* ---------------------------------------------------------------------------
   Single-series column chart, rendered to SVG at build time.

   Why build-time and not in the browser: the press PDF is rendered by headless
   Chrome, and a chart that paints itself on DOMContentLoaded is a race against
   the print snapshot. The SVG is therefore baked into both outputs, and the
   flipbook attaches its hover layer to the same static marks. Print gets a
   correct chart with no JavaScript at all.

   One series only. The brand pair cannot carry two: cyan #c9ebfc measures
   1.22:1 against cream, and cyan against cream measures dE 7.0 to normal
   vision. Both are hard fails, so a second series would have to invent a
   colour outside the brand. See docs/ for the validator output.
--------------------------------------------------------------------------- */

const NAVY = "#1e335e";
const GRID = "rgba(30, 51, 94, 0.16)";
const TEXT = "rgba(0, 0, 0, 0.55)";

/* A bar is capped rather than filling its slot, and the data-end is rounded
   while the baseline stays square. Drawn as a path because a rect cannot
   round two corners only. */
function columnPath(x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h);
  return [
    `M${x} ${y + h}`,
    `V${y + rad}`,
    `a${rad} ${rad} 0 0 1 ${rad} ${-rad}`,
    `h${w - rad * 2}`,
    `a${rad} ${rad} 0 0 1 ${rad} ${rad}`,
    `V${y + h}`,
    "Z",
  ].join(" ");
}

function niceCeiling(max) {
  if (max <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (step * mag >= max) return step * mag;
  }
  return 10 * mag;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

/**
 * @param {{label: string|number, value: number}[]} series
 * @param {{format?: (n:number)=>string, axisFormat?: (n:number)=>string,
 *          width?: number, height?: number, labelEvery?: number}} opts
 */
export function columnChart(series, opts = {}) {
  const {
    format = (n) => String(n),
    axisFormat = format,
    width = 940,
    height = 400,
    labelEvery = 1,
  } = opts;

  if (!series.length) throw new Error("columnChart: empty series");

  const pad = { top: 34, right: 8, bottom: 40, left: 62 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const top = niceCeiling(Math.max(...series.map((d) => d.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * top);

  const slot = plotW / series.length;
  const barW = Math.min(24, slot * 0.52);

  const parts = [];

  // Gridlines: hairline, solid, recessive — and the axis labels that carry
  // the values not directly labelled.
  for (const t of ticks) {
    const y = pad.top + plotH - (t / top) * plotH;
    parts.push(
      `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${width - pad.right}" y2="${y.toFixed(1)}" stroke="${GRID}" stroke-width="1"/>`,
      `<text x="${pad.left - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="chart__tick">${esc(axisFormat(t))}</text>`,
    );
  }

  series.forEach((d, i) => {
    const h = Math.max(2, (d.value / top) * plotH);
    const x = pad.left + i * slot + (slot - barW) / 2;
    const y = pad.top + plotH - h;
    const isLast = i === series.length - 1;

    // The hit target spans the whole slot, so the pointer only has to be
    // closest to a column, not on it.
    parts.push(
      `<g class="chart__col" data-label="${esc(d.label)}" data-value="${esc(format(d.value))}">`,
      `<rect class="chart__hit" x="${(pad.left + i * slot).toFixed(1)}" y="${pad.top}" width="${slot.toFixed(1)}" height="${plotH}" fill="transparent"/>`,
      `<path class="chart__bar" d="${columnPath(x, y, barW, h, 4)}" fill="${NAVY}"/>`,
      `</g>`,
      `<text x="${(x + barW / 2).toFixed(1)}" y="${height - pad.bottom + 20}" text-anchor="middle" class="chart__axis">${esc(d.label)}</text>`,
    );

    // Label selectively: the endpoint only. A number on every column is noise.
    if (isLast || (labelEvery > 1 && i % labelEvery === 0)) {
      parts.push(
        `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle" class="chart__value">${esc(format(d.value))}</text>`,
      );
    }
  });

  // Baseline, drawn last so it sits above the gridline at zero.
  const base = pad.top + plotH;
  parts.push(
    `<line x1="${pad.left}" y1="${base}" x2="${width - pad.right}" y2="${base}" stroke="${GRID}" stroke-width="1"/>`,
  );

  return `<svg class="chart__svg" viewBox="0 0 ${width} ${height}" role="img" preserveAspectRatio="xMidYMid meet">
${parts.join("\n")}
</svg>`;
}

/* ---------------------------------------------------------------------------
   Emphasis line chart: one series is the story, the rest are context.

   This is how ten brokerages fit a two-colour brand. The subject is drawn in
   navy; everyone else is one de-emphasis gray. Gray is not a categorical hue,
   so nothing here asks the palette to tell ten things apart by colour — which
   it cannot do, and which no amount of secondary encoding would fix.
--------------------------------------------------------------------------- */

const CONTEXT = "rgba(30, 51, 94, 0.22)";

/**
 * @param {{name: string, values: (number|null)[], subject?: boolean}[]} series
 * @param {(string|number)[]} labels  x-axis categories, one per value
 */
export function emphasisLineChart(series, labels, opts = {}) {
  const {
    format = (n) => String(n),
    axisFormat = format,
    width = 940,
    height = 430,
  } = opts;

  const pad = { top: 26, right: 128, bottom: 38, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  const top = niceCeiling(Math.max(...all));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * top);

  const x = (i) => pad.left + (labels.length === 1 ? 0 : (i / (labels.length - 1)) * plotW);
  const y = (v) => pad.top + plotH - (v / top) * plotH;

  const parts = [];

  for (const t of ticks) {
    parts.push(
      `<line x1="${pad.left}" y1="${y(t).toFixed(1)}" x2="${(width - pad.right).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="${GRID}" stroke-width="1"/>`,
      `<text x="${pad.left - 11}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end" class="chart__tick">${esc(axisFormat(t))}</text>`,
    );
  }

  labels.forEach((l, i) => {
    parts.push(
      `<text x="${x(i).toFixed(1)}" y="${height - pad.bottom + 20}" text-anchor="middle" class="chart__axis">${esc(l)}</text>`,
    );
  });

  /* A zero here means "not trading in this market that year", not "held zero
     percent". Plotting it as a point on the axis would invent a flat line
     along the bottom for firms that did not exist yet, so the run is broken
     instead and the line simply starts or stops. */
  function path(values) {
    const out = [];
    let pen = false;
    values.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      out.push(`${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
      pen = true;
    });
    return out.join(" ");
  }

  const context = series.filter((s) => !s.subject);
  const subject = series.find((s) => s.subject);

  for (const s of context) {
    const d = path(s.values);
    if (d) parts.push(`<path d="${d}" fill="none" stroke="${CONTEXT}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`);
  }

  if (subject) {
    parts.push(
      `<path d="${path(subject.values)}" fill="none" stroke="${NAVY}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,
    );
    // End marker carries a surface ring so it stays legible where it crosses
    // a context line.
    const lastIdx = subject.values.reduce((acc, v, i) => (v != null ? i : acc), -1);
    if (lastIdx >= 0) {
      parts.push(
        `<circle cx="${x(lastIdx).toFixed(1)}" cy="${y(subject.values[lastIdx]).toFixed(1)}" r="5" fill="${NAVY}" stroke="var(--cream)" stroke-width="2"/>`,
        `<text x="${(x(lastIdx) + 14).toFixed(1)}" y="${(y(subject.values[lastIdx]) - 8).toFixed(1)}" class="chart__value">${esc(format(subject.values[lastIdx]))}</text>`,
        `<text x="${(x(lastIdx) + 14).toFixed(1)}" y="${(y(subject.values[lastIdx]) + 10).toFixed(1)}" class="chart__lede">${esc(subject.name)}</text>`,
      );
    }
  }

  // Hover columns: one per year, spanning the full plot height, so the
  // pointer only has to find the year.
  const band = labels.length > 1 ? plotW / (labels.length - 1) : plotW;
  labels.forEach((l, i) => {
    const rows = series
      .map((s) => ({ name: s.name, v: s.values[i] }))
      .filter((r) => r.v != null)
      .sort((a, b) => b.v - a.v)
      .map((r) => `${r.name} ${format(r.v)}`)
      .join("\n");
    parts.push(
      `<g class="chart__col" data-label="${esc(l)}" data-rows="${esc(rows)}">`,
      `<rect class="chart__hit" x="${(x(i) - band / 2).toFixed(1)}" y="${pad.top}" width="${band.toFixed(1)}" height="${plotH}" fill="transparent"/>`,
      `<line class="chart__crosshair" x1="${x(i).toFixed(1)}" y1="${pad.top}" x2="${x(i).toFixed(1)}" y2="${(pad.top + plotH).toFixed(1)}" stroke="${NAVY}" stroke-width="1" opacity="0"/>`,
      `</g>`,
    );
  });

  return `<svg class="chart__svg" viewBox="0 0 ${width} ${height}" role="img" preserveAspectRatio="xMidYMid meet">
${parts.join("\n")}
</svg>`;
}

/** Accessible fallback, and the reason a tooltip is allowed to be an enhancement. */
export function dataTable(series, { format = String, caption = "", labelHead = "Year", valueHead = "Value" } = {}) {
  const rows = series
    .map((d) => `<tr><th scope="row">${esc(d.label)}</th><td>${esc(format(d.value))}</td></tr>`)
    .join("\n");
  return `<table class="chart__table">
${caption ? `<caption>${esc(caption)}</caption>` : ""}
<thead><tr><th scope="col">${esc(labelHead)}</th><th scope="col">${esc(valueHead)}</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
}
