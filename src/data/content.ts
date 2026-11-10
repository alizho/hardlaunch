// Everything you would normally swap lives here.
//
// To use real media, drop files in public/assets/media and replace a
// `placeholder` slide with one of these:
//   { kind: "image", src: "/assets/media/foo.jpg", caption: "Brand film" }
//   { kind: "video", src: "/assets/media/foo.mp4", caption: "Brand film" }
// Add a slide to the main thumbnail and the progress bar gains a segment.

import type { CSSProperties } from "react";

export type Slide =
  | { kind: "image"; src: string; caption: string; imgStyle?: CSSProperties }
  | { kind: "video"; src: string; caption: string }
  | { kind: "placeholder"; label: string; caption: string };

export type TagColors = { bg: string; fg: string };

export type Thumbnail = {
  name: string;
  year: string;
  tag: TagColors;
  border: string;
  glow: string;
  durationMs: number;
  slides: Slide[];
};

const placeholders = (from: number, to: number, total: number): Slide[] =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const n = from + i;
    return {
      kind: "placeholder" as const,
      label: `Placeholder ${n}/${total}`,
      caption: `Placeholder caption ${n}`,
    };
  });

export const mainThumbnail: Thumbnail = {
  name: "Ghost",
  year: "2026",
  tag: { bg: "#ffffff", fg: "#a0a0a0" },
  border: "#c6c6c6",
  glow: "#00aeff",
  durationMs: 6000,
  slides: [
    { kind: "image", src: "/assets/media/ghost.png", caption: "Launch video" },
    ...placeholders(2, 7, 7),
  ],
};

export const sideThumbnails: Thumbnail[] = [
  {
    name: "Eigen",
    year: "2026",
    tag: { bg: "#d7ffb1", fg: "#62ca00" },
    border: "#caffaf",
    glow: "#90ff00",
    durationMs: 5000,
    slides: [
      {
        kind: "image",
        src: "/assets/media/eigen.png",
        caption: "Website",
        imgStyle: {
          opacity: 0.75,
          height: "100%",
          left: "0.05%",
          top: "0.66%",
          width: "100.63%",
        },
      },
      ...placeholders(2, 3, 3),
    ],
  },
  {
    name: "Tomo",
    year: "2026",
    tag: { bg: "#fffc78", fg: "#b7b300" },
    border: "#f3ff74",
    glow: "#00aeff",
    durationMs: 7000,
    slides: [
      {
        kind: "image",
        src: "/assets/media/tomo.png",
        caption: "Launch merch",
        imgStyle: {
          height: "135.29%",
          left: "-13.31%",
          top: "-31.12%",
          width: "117.19%",
        },
      },
      ...placeholders(2, 3, 3),
    ],
  },
];

// Every company on the site, in directory order. To add one:
//   1. Export its logo from Figma as an SVG and save it as
//      src/assets/logos/<id>.svg (e.g. "acme" -> acme.svg).
//   2. Add a line here with id, name, year, and color.
// It then appears in the directory and the intro. Balloon size comes from the
// SVG; anything exported far outside 60-120 wide is rescaled to fit.
//
// Everything else is optional, and worked out when left out:
//   home: top-left of the balloon in the header, on the 1728-wide Figma frame
//   scatter / scatterPhone: where it sits around the centered logo in the intro
//   directoryWidth: width of the logo in the directory row
//   tiles: up to five images for the expanded row. A missing `src` shows gray.
//
// To use different art in the directory, add src/assets/logos/<id>.directory.svg
// at the size it should appear (about 30 wide).
export type Point = [number, number];

export type Company = {
  id: string;
  name: string;
  year: string;
  color: string;
  home?: Point;
  scatter?: Point;
  scatterPhone?: Point;
  directoryWidth?: number;
  tiles?: { src?: string; alt?: string }[];
};

export const companies: Company[] = [
  { id: "ghost", name: "Ghost", year: "2026", color: "#757575", directoryWidth: 27.821, home: [439.09, 0], scatter: [-255, -240], scatterPhone: [-65, -265] },
  { id: "tomo", name: "Tomo", year: "2026", color: "#aba800", home: [514.13, 9.81], scatter: [-120, -175], scatterPhone: [-20, -135] },
  { id: "eigen", name: "Eigen", year: "2026", color: "#7ca600", home: [1160.1, 7.53], scatter: [95, -230], scatterPhone: [55, -250] },
  { id: "omen", name: "Omen", year: "2026", color: "#ff8400", home: [353.53, 56.92], scatter: [-255, -105], scatterPhone: [-172, -75] },
  { id: "spur", name: "Spur", year: "2026", color: "#ff00dd", home: [344.07, 150.22], scatter: [-390, -195], scatterPhone: [-125, -205] },
  { id: "listen-labs", name: "Listen Labs", year: "2026", color: "#0d00ff", home: [0, 0], scatter: [-85, 225], scatterPhone: [-60, 255] },
  { id: "osmosis", name: "Osmosis", year: "2026", color: "#00ffcc", home: [1336.92, 3.24], scatter: [285, -120], scatterPhone: [140, -140] },
  { id: "fulcrum", name: "Fulcrum", year: "2026", color: "#9000c0", home: [1550.31, 82.53], scatter: [370, 90], scatterPhone: [165, 125] },
  { id: "metis", name: "Metis", year: "2026", color: "#296d07", home: [150.98, 91.02], scatter: [-310, 105], scatterPhone: [-110, 125] },
  { id: "flora", name: "Flora", year: "2026", color: "#000000", home: [247.1, 0.02], scatter: [-425, 20], scatterPhone: [-183, 40] },
  { id: "andera", name: "Andera", year: "2026", color: "#000000", home: [1646.36, 7.62], scatter: [150, 215], scatterPhone: [70, 240] },
  { id: "corridor", name: "Corridor", year: "2026", color: "#f397ff", home: [1407.12, 155.36], scatter: [445, -205], scatterPhone: [183, -35] },
  { id: "haize-labs", name: "Haize Labs", year: "2026", color: "#52a22a", home: [81.12, 4.12], scatter: [-330, 215], scatterPhone: [-165, 205] },
  { id: "coframe", name: "Coframe", year: "2026", color: "#000000", home: [1247.78, 2], scatter: [245, -250], scatterPhone: [150, -245] },
];

export const tileWidths = [204.595, 114.455, 155.823, 155.823, 188.347];
