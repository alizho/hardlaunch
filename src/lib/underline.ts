// Underlines that break around descenders (the tail of "g", "p", "y"...),
// with rounded ends on every piece. The browser's own skip-ink does the
// breaking but can't round the ends, so the gaps are found here instead:
// the word is drawn to a canvas and the underline's band is scanned for ink.
//
// All values are in em, so they scale with the font without remeasuring.

// Underline top, measured down from the baseline.
export const UNDERLINE_OFFSET = 0.07;
export const UNDERLINE_THICKNESS = 0.1;
// Clear space between the underline and a descender, each side.
const GAP = 0.07;
// Drawing scale, for sub-pixel precision.
const SCALE = 4;

export type Underline = {
  // Baseline, down from the top of the word's box.
  baseline: number;
  // [left, right] pieces of the line.
  segments: [number, number][];
};

export function measureUnderline(word: HTMLElement, probe: HTMLElement): Underline | null {
  const text = word.firstChild;
  if (!text || text.nodeType !== Node.TEXT_NODE) return null;

  const cs = getComputedStyle(word);
  const fontSize = parseFloat(cs.fontSize);
  const box = word.getBoundingClientRect();
  if (!fontSize || !box.width) return null;

  // The probe is an empty inline-block, so its bottom sits on the baseline.
  const baselinePx = probe.getBoundingClientRect().bottom - box.top;
  const bandTop = baselinePx + UNDERLINE_OFFSET * fontSize;
  const bandHeight = UNDERLINE_THICKNESS * fontSize;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(box.width * SCALE);
  canvas.height = Math.ceil((bandTop + bandHeight + fontSize) * SCALE);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.scale(SCALE, SCALE);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";

  // Draw each letter where the page put it, so spacing matches exactly.
  const range = document.createRange();
  const content = text.textContent ?? "";
  for (let i = 0; i < content.length; i++) {
    range.setStart(text, i);
    range.setEnd(text, i + 1);
    const r = range.getBoundingClientRect();
    ctx.fillText(content[i], r.left - box.left, baselinePx);
  }

  // Which columns have ink inside the underline's band.
  const y0 = Math.floor(bandTop * SCALE);
  const h = Math.max(1, Math.ceil(bandHeight * SCALE));
  const { data } = ctx.getImageData(0, y0, canvas.width, h);
  const inked: boolean[] = new Array(canvas.width).fill(false);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 40) inked[x] = true;
    }
  }

  // Cut each inked run, plus the gap, out of the full width.
  const toEm = (px: number) => px / SCALE / fontSize;
  const width = toEm(canvas.width);
  const segments: [number, number][] = [];
  let start = 0;
  for (let x = 0; x <= canvas.width; x++) {
    if (x < canvas.width && inked[x]) {
      let end = x;
      while (end < canvas.width && inked[end]) end++;
      const cut0 = toEm(x) - GAP;
      const cut1 = toEm(end) + GAP;
      if (cut0 > start) segments.push([start, cut0]);
      start = Math.max(start, cut1);
      x = end;
    }
  }
  if (start < width) segments.push([start, width]);

  return {
    baseline: baselinePx / fontSize,
    // Drop slivers too short to read as a line.
    segments: segments.filter(([a, b]) => b - a > UNDERLINE_THICKNESS),
  };
}
