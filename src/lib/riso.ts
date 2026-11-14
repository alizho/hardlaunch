import { useSyncExternalStore } from "react";

// The risograph look: a halftone screen over the sky (drawn by the cloud shader,
// see Clouds.tsx), paper grain over the sky and balloons, and the same grain cut
// out of the logo and icons. Text is never touched. Tuned from RisoPanel.tsx.
export type RisoSettings = {
  enabled: boolean;
  halftone: number; // 0 leaves the clouds smooth, 1 turns them fully into dots
  cell: number; // distance between dots, in CSS px
  angle: number; // screen angle, in degrees
  softness: number; // 0 is crisp dots, 1 is blurry ones
  density: number; // how solid the blue prints; below 1 lets paper show between dots
  grain: number; // paper specks over the sky and balloons
  grainSize: number; // size of one speck, in CSS px
  assetGrain: number; // specks missing from the logo and icons
};

// Set to true to bring back the RISO tab on the right edge of the screen, with
// live sliders for everything below. While it's off, RISO_DEFAULTS is always
// what shows; while it's on, changes made in the panel are saved in the browser.
export const RISO_PANEL = false;

// The look every visitor gets. Edit the numbers here, or turn the panel on,
// tune there, press Copy, and paste the result over this.
export const RISO_DEFAULTS: RisoSettings = {
  enabled: true,
  halftone: 0.55,
  cell: 3,
  angle: 27,
  softness: 0.37,
  density: 1,
  grain: 0.06,
  grainSize: 0.9,
  assetGrain: 0,
};

const STORAGE_KEY = "riso";
const TILE = 256; // specks per side of the repeating grain tile

function load(): RisoSettings {
  if (!RISO_PANEL) return RISO_DEFAULTS;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved && typeof saved === "object") return { ...RISO_DEFAULTS, ...saved };
  } catch {
    // Unreadable or blocked storage: fall through to the defaults.
  }
  return RISO_DEFAULTS;
}

let settings = load();
const listeners = new Set<() => void>();

// Two tiles from the same noise: white specks to lay over the sky, and solid
// ink with the same specks missing, used as a mask on the logo and icons.
function makeTiles() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TILE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const paper = context.createImageData(TILE, TILE);
  const ink = context.createImageData(TILE, TILE);
  for (let i = 0; i < TILE * TILE; i++) {
    // About half the specks are empty; the rest range up to solid.
    const speck = Math.max(0, Math.random() * 2 - 1);
    paper.data.set([255, 255, 255, speck * 255], i * 4);
    ink.data.set([0, 0, 0, (1 - speck) * 255], i * 4);
  }
  const url = (image: ImageData) => {
    context.putImageData(image, 0, 0);
    return `url(${canvas.toDataURL()})`;
  };
  return { paper: url(paper), ink: url(ink) };
}

let tiles: ReturnType<typeof makeTiles> | undefined;

function apply() {
  const root = document.documentElement;
  if (!settings.enabled) {
    delete root.dataset.riso;
    return;
  }
  tiles ??= makeTiles();
  // "assets" also cuts grain out of the logo and icons; skipped when there's none.
  root.dataset.riso = settings.assetGrain > 0 ? "assets" : "";
  root.style.setProperty("--riso-paper-tile", tiles?.paper ?? "none");
  root.style.setProperty("--riso-ink-tile", tiles?.ink ?? "none");
  root.style.setProperty("--riso-tile-size", `${TILE * settings.grainSize}px`);
  root.style.setProperty("--riso-grain", String(settings.grain));
  root.style.setProperty("--riso-asset-solid", String(1 - settings.assetGrain));
}

export function initRiso() {
  apply();
}

export function getRiso() {
  return settings;
}

export function setRiso(patch: Partial<RisoSettings>) {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Not saved; the change still applies for this visit.
  }
  apply();
  listeners.forEach((listener) => listener());
}

export function subscribeRiso(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRiso() {
  return useSyncExternalStore(subscribeRiso, getRiso);
}
