// The light that crosses the logo: two bands of soft holographic color, a wide
// one and a thinner one behind it, sliding from left to right. It plays when
// the intro lands the logo and whenever the logo is clicked. The bands' colors,
// widths and angle are .logo-shine in styles.css.
const DURATION = 2400; // one band's trip across, in ms
const TRAIL = 200; // how long after the wide band the thin one sets off
// Slow to leave, quick through the middle, soft to land.
const EASING = "cubic-bezier(0.65, 0, 0.2, 1)";

// `delay` is in ms. Returns the animations, so a caller can cancel them.
export function shineLogo(delay = 0): Animation[] {
  const bands = [...document.querySelectorAll<HTMLElement>(".logo-shine span")];
  // Starting again during a pass starts it over.
  for (const band of bands) for (const running of band.getAnimations()) running.cancel();

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // No travel: the light comes up in place and goes again.
    return bands.map((band) => band.animate({ opacity: [0, 0.7, 0] }, { delay, duration: 700, easing: "ease-in-out" }));
  }
  return bands.map((band, i) =>
    band.animate(
      { transform: ["translateX(-100%)", "translateX(100%)"], opacity: [1, 1] },
      { delay: delay + i * TRAIL, duration: DURATION, easing: EASING },
    ),
  );
}
