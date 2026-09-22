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
