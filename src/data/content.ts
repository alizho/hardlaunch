// Every company in the intro. To add one:
//   1. Export its logo from Figma as an SVG and save it as
//      src/assets/logos/<id>.svg (e.g. "acme" -> acme.svg).
//   2. Add a line here with id, name, year, and color.
// It then appears in the intro. Balloon size comes from the
// SVG; anything exported far outside 60-120 wide is rescaled to fit.
//
// Everything else is optional, and worked out when left out:
//   home: top-left of the balloon in the header, on the 1728-wide Figma frame
//   scatter / scatterPhone: where it sits around the centered logo in the intro
export type Point = [number, number];

export type Company = {
  id: string;
  name: string;
  year: string;
  color: string;
  home?: Point;
  scatter?: Point;
  scatterPhone?: Point;
};

export const companies: Company[] = [
  { id: "ghost", name: "Ghost", year: "2026", color: "#757575", home: [439.09, 0], scatter: [-255, -240], scatterPhone: [-65, -265] },
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
