// Every company in the intro. To add one:
//   1. Export its logo from Figma as an SVG and save it as
//      src/assets/logos/<id>.svg (e.g. "acme" -> acme.svg).
//   2. Add a line here with id, name, year, and color.
// It then appears in the intro. Balloon size comes from the
// SVG; anything exported far outside 60-120 wide is rescaled to fit.
//
// Everything else is optional, and worked out when left out:
//   link: opened in a new tab when the balloon is clicked (not dragged)
//   home: top-left of the balloon in the header, on the 1728-wide Figma frame
//   scatter / scatterPhone: which part of the even ring around the logo it takes
export type Point = [number, number];

export type Company = {
  id: string;
  name: string;
  year: string;
  color: string;
  link?: string;
  home?: Point;
  scatter?: Point;
  scatterPhone?: Point;
};

export const companies: Company[] = [
  { id: "ghost", name: "Ghost", year: "2026", color: "#757575", link: "https://x.com/zainmfj/status/2107146556176798081", home: [439.09, 0], scatter: [-255, -240], scatterPhone: [-65, -265] },
  { id: "tomo", name: "Tomo", year: "2026", color: "#aba800", link: "https://x.com/justoutquan/status/2070175262973862077", home: [514.13, 9.81], scatter: [-120, -175], scatterPhone: [-20, -135] },
  { id: "eigen", name: "Eigen", year: "2026", color: "#7ca600", link: "https://x.com/paulscherer/status/2044812094953164914", home: [1160.1, 7.53], scatter: [95, -230], scatterPhone: [55, -250] },
  { id: "omen", name: "Omen", year: "2026", color: "#ff8400", link: "https://x.com/FounderLaberge/status/2071630096545575317", home: [353.53, 56.92], scatter: [-255, -105], scatterPhone: [-172, -75] },
  { id: "spur", name: "Spur", year: "2026", color: "#ff00dd", link: "https://www.linkedin.com/posts/anushka-nijhawan-8380361b1_were-excited-to-share-that-spur-has-raised-activity-7318673319002546178-bY3n", home: [344.07, 150.22], scatter: [-390, -195], scatterPhone: [-125, -205] },
  { id: "listen-labs", name: "Listen Labs", year: "2026", color: "#0d00ff", link: "https://www.linkedin.com/posts/juengermann_my-first-three-startups-failed-i-learned-activity-7320831755161063424-vxgT", home: [0, 0], scatter: [-85, 225], scatterPhone: [-60, 255] },
  { id: "osmosis", name: "Osmosis", year: "2026", color: "#00ffcc", link: "https://www.linkedin.com/posts/kasey-zhang_were-excited-to-finally-launch-osmosis-activity-7384264333322584085-Su8T", home: [1336.92, 3.24], scatter: [285, -120], scatterPhone: [140, -140] },
  { id: "fulcrum", name: "Fulcrum", year: "2026", color: "#9000c0", link: "https://www.linkedin.com/feed/update/urn:li:activity:7421952680555728897/", home: [1550.31, 82.53], scatter: [370, 90], scatterPhone: [165, 125] },
  { id: "general-intelligence", name: "General Intelligence", year: "2026", color: "#CCA600", link: "https://www.x.com/ndrewpignanelli/status/1965452670128587033/" },
  { id: "metis", name: "Metis", year: "2026", color: "#296d07", link: "https://www.linkedin.com/posts/aryan-shah1_today-we-are-welcoming-the-metis-team-to-activity-7440073534116331520-80H6", home: [150.98, 91.02], scatter: [-310, 105], scatterPhone: [-110, 125] },
  { id: "flora", name: "Flora", year: "2026", color: "#000000", link: "https://x.com/weberwongwong/status/1894794612398792974", home: [247.1, 0.02], scatter: [-425, 20], scatterPhone: [-183, 40] },
  { id: "andera", name: "Andera", year: "2026", color: "#000000", link: "https://www.linkedin.com/posts/aryo-patel_today-were-announcing-anderas-37m-series-ugcPost-7485003453094850560-yIbF/", home: [1646.36, 7.62], scatter: [150, 215], scatterPhone: [70, 240] },
  { id: "corridor", name: "Corridor", year: "2026", color: "#f397ff", link: "https://www.linkedin.com/feed/update/urn:li:activity:7507831338272743424/", home: [1407.12, 155.36], scatter: [445, -205], scatterPhone: [183, -35] },
  { id: "haize-labs", name: "Haize Labs", year: "2026", color: "#52a22a", link: "https://x.com/haizelabs/status/1800936720990384174", home: [81.12, 4.12], scatter: [-330, 215], scatterPhone: [-165, 205] },
  { id: "coframe", name: "Coframe", year: "2026", color: "#000000", link: "https://www.linkedin.com/company/coframe-ai/home/", home: [1247.78, 2], scatter: [245, -250], scatterPhone: [150, -245] },
];
