/// <reference types="vite/client" />
// Turns the `companies` list into what the balloons render.
import { companies, type Point } from "../data/content";

const FIGMA_WIDTH = 1728;
const BALLOON_RANGE: Point = [60, 120]; // longest side a logo can keep as exported
const BALLOON_FALLBACK = 90; // longest side of a logo rescaled into range
const PHONE_BALLOON_SCALE = 0.58; // matches --balloon-scale in styles.css
const SEARCH_STEP = 15;

// The areas auto-placed balloons can use, in design px around the centered logo.
const SCATTER_AREA = { x: 445, top: -250, bottom: 225, logo: [198, 84] as Point };
const PHONE_SCATTER_AREA = { x: 183, top: -265, bottom: 255, logo: [130, 60] as Point };
const HOME_BAND = 40; // how far below the top edge a balloon can start
const HEADER_LOGO: Point = [732, 996]; // left and right edges of the logo in the header

export type BalloonDef = {
  id: string;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  link?: string;
  // Intro only: where this balloon sits relative to the centered logo, in design px.
  scatter: Point;
  scatterPhone: Point;
};

type Art = { src: string; w: number; h: number };
type Circle = { x: number; y: number; r: number };

const files = import.meta.glob<string>("../assets/logos/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

function readArt(file: string): Art | undefined {
  const svg = files[`../assets/logos/${file}.svg`];
  if (svg === undefined) return undefined;
  const box = svg.match(/viewBox="([^"]+)"/)?.[1].trim().split(/[\s,]+/).map(Number);
  if (box?.length !== 4 || box.some(Number.isNaN)) throw new Error(`${file}.svg has no usable viewBox`);
  return { src: `data:image/svg+xml,${encodeURIComponent(svg)}`, w: box[2], h: box[3] };
}

function balloonArt(id: string): Art {
  const art = readArt(id);
  if (!art) throw new Error(`Missing logo for "${id}": add src/assets/logos/${id}.svg`);
  const longest = Math.max(art.w, art.h);
  if (longest >= BALLOON_RANGE[0] && longest <= BALLOON_RANGE[1]) return art;
  const fit = BALLOON_FALLBACK / longest;
  return { ...art, w: art.w * fit, h: art.h * fit };
}

const radius = (w: number, h: number) => (w + h) / 4;

// The candidate that leaves the most room to everything already placed.
function roomiest(candidates: Point[], taken: Circle[], r: number): Point {
  let best = candidates[0];
  let bestGap = -Infinity;
  for (const [x, y] of candidates) {
    const gap = Math.min(...taken.map((t) => Math.hypot(x - t.x, y - t.y) - t.r - r));
    if (gap > bestGap) {
      bestGap = gap;
      best = [x, y];
    }
  }
  return best;
}

function homeCandidates(r: number, w: number) {
  const candidates: Point[] = [];
  for (let y = r; y <= r + HOME_BAND; y += SEARCH_STEP) {
    for (let x = w / 2; x <= FIGMA_WIDTH - w / 2; x += SEARCH_STEP) {
      if (x + r < HEADER_LOGO[0] || x - r > HEADER_LOGO[1]) candidates.push([x, y]);
    }
  }
  return candidates;
}

function scatterCandidates(area: typeof SCATTER_AREA, r: number) {
  const candidates: Point[] = [];
  for (let y = area.top; y <= area.bottom; y += SEARCH_STEP) {
    for (let x = -area.x; x <= area.x; x += SEARCH_STEP) {
      if (Math.abs(x) > area.logo[0] + r || Math.abs(y) > area.logo[1] + r) candidates.push([x, y]);
    }
  }
  return candidates;
}

function placeBalloons(): BalloonDef[] {
  const entries = companies.map((company) => {
    const art = balloonArt(company.id);
    return { company, art, r: radius(art.w, art.h) };
  });

  // Hand-placed balloons are claimed first, so auto-placed ones work around them.
  const homes = entries.flatMap(({ company: { home }, art, r }) =>
    home ? [{ x: home[0] + art.w / 2, y: home[1] + art.h / 2, r }] : [],
  );
  const claimed = (point: "scatter" | "scatterPhone", scale: number) =>
    entries.flatMap(({ company, r }) => {
      const spot = company[point];
      return spot ? [{ x: spot[0], y: spot[1], r: r * scale }] : [];
    });
  const scatters = claimed("scatter", 1);
  const phoneScatters = claimed("scatterPhone", PHONE_BALLOON_SCALE);

  const balloons = entries.map(({ company, art, r }): BalloonDef => {
    let home = company.home;
    if (!home) {
      const [x, y] = roomiest(homeCandidates(r, art.w), homes, r);
      homes.push({ x, y, r });
      home = [x - art.w / 2, y - art.h / 2];
    }
    let scatter = company.scatter;
    if (!scatter) {
      scatter = roomiest(scatterCandidates(SCATTER_AREA, r), scatters, r);
      scatters.push({ x: scatter[0], y: scatter[1], r });
    }
    let scatterPhone = company.scatterPhone;
    if (!scatterPhone) {
      const phoneR = r * PHONE_BALLOON_SCALE;
      scatterPhone = roomiest(scatterCandidates(PHONE_SCATTER_AREA, phoneR), phoneScatters, phoneR);
      phoneScatters.push({ x: scatterPhone[0], y: scatterPhone[1], r: phoneR });
    }
    return { id: company.id, link: company.link, src: art.src, x: home[0], y: home[1], w: art.w, h: art.h, scatter, scatterPhone };
  });

  // Left to right by home position, which is also the order they pop in.
  return balloons.sort((a, b) => a.x - b.x);
}

export const balloons = placeBalloons();
