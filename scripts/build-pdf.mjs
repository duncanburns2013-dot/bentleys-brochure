/* ---------------------------------------------------------------------------
   Renders dist/print.html to a press-ready PDF with headless Chrome.

   Chrome is driven directly rather than through Puppeteer so the build has no
   browser download step and uses the Chrome already on the machine.

   NOTE ON COLOUR: Chrome emits RGB. The spec makes CMYK the print authority,
   so the shop converts on receipt, or we run a Ghostscript CMYK pass. Either
   way a printed proof is required before a production run — screen navy and
   press navy are not the same colour.
--------------------------------------------------------------------------- */

import { spawn } from "node:child_process";
import { access, stat, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = join(ROOT, "dist", "print.html");

/* The PDF lands in the parent drive folder, beside the rest of the brochure
   material — deliberately outside the repo. Two reasons: `npm run build`
   clears dist/, so a PDF there would be deleted by the next build; and the
   book is ~10MB, which would be re-committed in full on every rebuild. */
const OUTPUT = join(ROOT, "..", "bentleys-listing-presentation.pdf");

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

async function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    try {
      await access(p);
      return p;
    } catch {}
  }
  throw new Error(
    "Chrome not found. Install Chrome, or add its path to CHROME_CANDIDATES.",
  );
}

async function main() {
  try {
    await access(INPUT);
  } catch {
    throw new Error("dist/print.html is missing — run `npm run build` first.");
  }

  const chrome = await findChrome();
  await mkdir(dirname(OUTPUT), { recursive: true });

  const args = [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    // Without this, Chrome drops backgrounds and the navy pages print white.
    "--print-to-pdf-no-header",
    `--print-to-pdf=${OUTPUT}`,
    // Local fonts and images are same-origin file:// reads.
    "--allow-file-access-from-files",
    pathToFileURL(INPUT).href,
  ];

  await new Promise((resolve, reject) => {
    const proc = spawn(chrome, args, { stdio: "inherit" });
    proc.on("error", reject);
    proc.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`chrome exited ${code}`)),
    );
  });

  const { size } = await stat(OUTPUT);
  console.log(`wrote ${OUTPUT} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  console.log("page box 8.75 x 11.25in = 8.5 x 11in trim + 0.125in bleed");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
