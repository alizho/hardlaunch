// The page-load intro. Every beat is in ms from the moment the logo and balloons
// have loaded, so the whole sequence can be retimed from this table.
export const INTRO = {
  // 1. Center
  logoPop: 0,
  // Where the balloons start: "ring" spaces them evenly around the logo,
  // "scattered" drops them at random near the logo without touching it.
  balloonStart: "scattered" as "ring" | "scattered",
  balloonPop: 200,
  balloonStagger: 55,
  // 2. The logo settles above the tagline while the balloons rise to the top.
  lift: 1250,
  liftDuration: 1600,
  balloonFloat: 3200, // how long the balloons take to reach the top
  // The white gradient rises from below, a little ahead of the logo.
  white: 1600,
  whiteDuration: 1500,
  // 3. Tagline. Starts just before the logo lands so the page never waits on it.
  tagline: 2450,
  socials: 2300, // just under the logo, so they come in before the tagline
  socialsStagger: 70,
  socialsDuration: 760,
  socialsBounceSwings: 2, // fewer, slower swings than the other pops

  // The bounce on every intro pop.
  bounceSwings: 3.2, // frequency: half-swings per pop. Lower is fewer, slower swings.
  bounceDecay: 0.9, // how fast swings shrink: 0.3 rings on a long time, 1 dies out quickly
  bounceOvershoot: 0.3, // size of the first swing past full size (0.2 = 20%). Must be above 0.
};

// Sampled into a CSS linear() curve, since a spring can't be written as a bezier.
function buildBounceEasing(bounceSwings: number = INTRO.bounceSwings) {
  if (!CSS.supports("transition-timing-function", "linear(0, 1)")) return "cubic-bezier(0.51, 0.01, 0.17, 0.94)";
  const { bounceDecay, bounceOvershoot } = INTRO;
  const SAMPLES = 60;
  const frequency = bounceSwings * Math.PI;
  const falloff = Math.log(1 / bounceOvershoot) / (Math.PI / frequency) ** bounceDecay;
  // (1 - t^8) lands the last swing exactly on 1.
  const swings = (t: number) =>
    1 - Math.exp(-falloff * t ** bounceDecay) * Math.cos(frequency * t) * (1 - t ** 8);
  // The opening is a cubic ease-out, slowing to a stop at the top of the first swing.
  const firstPeakAt = 1 / bounceSwings;
  const firstPeak = swings(firstPeakAt);
  const at = (t: number) => (t < firstPeakAt ? firstPeak * (1 - (1 - t / firstPeakAt) ** 3) : swings(t));
  const stops = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = i / SAMPLES;
    return `${at(t).toFixed(3)} ${(t * 100).toFixed(1)}%`;
  });
  return `linear(${stops.join(", ")})`;
}

const BOUNCE_EASING = buildBounceEasing();
const SOCIALS_EASING = buildBounceEasing(INTRO.socialsBounceSwings);
const LIFT_EASING = "cubic-bezier(0.45, 0, 0.2, 1)";
// Out-circ: quick off the mark, then a long, soft settle.
const WHITE_EASING = "cubic-bezier(0, 0.55, 0.45, 1)";
const ASSET_TIMEOUT = 1500;

const root = document.documentElement;

// Runs before the first render so nothing can paint ahead of the intro.
// Reduced-motion visitors get the finished page straight away.
export function prepareIntro() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  root.dataset.intro = "pending";
}

export const isIntroPending = () => root.dataset.intro === "pending";

let assets: Promise<unknown> | undefined;

export function introAssetsReady() {
  assets ??= Promise.race([
    Promise.all(
      [...document.querySelectorAll<HTMLImageElement>(".site-logo img, .balloon img")].map((img) =>
        img.decode().catch(() => {}),
      ),
    ),
    new Promise((resolve) => setTimeout(resolve, ASSET_TIMEOUT)),
  ]);
  return assets;
}

// Uses the individual `scale` property so it never fights a `transform` that
// layout, scroll, or physics already owns on the same element. Opacity finishes
// halfway along the curve so the bounce's dips below 1 never make it flicker.
export function pop(el: Element, delay: number, from: number, duration = 640, easing = BOUNCE_EASING) {
  return el.animate(
    [
      { opacity: 0, scale: from },
      { opacity: 1, scale: (from + 1) / 2, offset: 0.5 },
      { opacity: 1, scale: 1 },
    ],
    { delay, duration, easing, fill: "backwards" },
  );
}

// Plays everything except the balloons, which BalloonField drives because their
// positions belong to the physics world. Returns a cleanup function.
export function playIntro() {
  let cancelled = false;
  let revealTimer = 0;
  const running: Animation[] = [];

  introAssetsReady().then(() => {
    if (cancelled) return;
    const find = <T extends Element>(selector: string) => [...document.querySelectorAll<T>(selector)];

    const [frame] = find<HTMLElement>(".site-logo");
    const [logo] = find<HTMLElement>(".site-logo a");
    const [logoImage] = find<HTMLElement>(".site-logo img");
    const { top, height } = frame.getBoundingClientRect();
    const toCenter = window.innerHeight / 2 - (top + height / 2);
    running.push(
      pop(logoImage, INTRO.logoPop, 0.72, 860),
      logo.animate(
        { translate: [`0 ${toCenter}px`, "0 0"] },
        { delay: INTRO.lift, duration: INTRO.liftDuration, easing: LIFT_EASING, fill: "backwards" },
      ),
    );

    // The white rises from below the fold over the blue.
    for (const white of find(".hero-white")) {
      running.push(
        white.animate(
          { translate: [`0 ${window.innerHeight}px`, "0 0"] },
          { delay: INTRO.white, duration: INTRO.whiteDuration, easing: WHITE_EASING, fill: "backwards" },
        ),
      );
    }

    for (const tagline of find(".tagline")) {
      running.push(
        tagline.animate(
          { opacity: [0, 1] },
          { delay: INTRO.tagline, duration: 500, easing: "ease-out", fill: "backwards" },
        ),
      );
    }

    // The social buttons pop in under the logo, ahead of the tagline.
    find(".social").forEach((button, i) => {
      running.push(pop(button, INTRO.socials + i * INTRO.socialsStagger, 0.6, INTRO.socialsDuration, SOCIALS_EASING));
    });

    root.dataset.intro = "playing";
    revealTimer = window.setTimeout(() => {
      delete root.dataset.intro;
    }, INTRO.tagline);
  });

  return () => {
    cancelled = true;
    clearTimeout(revealTimer);
    running.forEach((animation) => animation.cancel());
  };
}
