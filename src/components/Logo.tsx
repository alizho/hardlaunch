import { useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { useFollow } from "../lib/useFollow";
import { onHoverOffSfx, onHoverSfx } from "../lib/sfx";

// What the balloons do once the intro lets them go:
//   "orbit": they circle the logo and text; clicking the logo sends them up to float.
//   "float": they rise to the top and float; clicking the logo sets them circling.
// Either way, each click on the logo switches between the two.
export const BALLOON_DEFAULT: "orbit" | "float" = "orbit";

// Clicking the logo toggles the balloons between floating and circling it.
// Further down the page, where it sits small at the top, it scrolls back up.
// BalloonField listens for this; `detail` is true to start circling.
export const ORBIT_EVENT = "balloons:orbit";

// Scrolling shrinks the logo into the top of the screen, where it stays.
// `end` is its distance from the top once small and `distance` is how far the
// page scrolls to get it there, both in rem; `scale` is its size once small.
const DESKTOP = { end: 2.4, scale: 0.31, distance: 30 };
const PHONE = { end: 1.2, scale: 0.43, distance: 16 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function Logo({ logoRef }: { logoRef: RefObject<HTMLHeadingElement | null> }) {
  const { hitRef, targetRef } = useFollow<HTMLAnchorElement, HTMLImageElement>(0.5);
  const [orbiting, setOrbiting] = useState(BALLOON_DEFAULT === "orbit");
  // Read from a ref so quick repeat clicks never act on a stale state.
  const orbitingRef = useRef(orbiting);
  const shrunk = useRef(false);

  useLayoutEffect(() => {
    const el = logoRef.current;
    if (!el) return;
    const phone = matchMedia("(max-width: 899px)");
    let frame = 0;

    const apply = () => {
      frame = 0;
      const config = phone.matches ? PHONE : DESKTOP;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const linear = Math.min(1, Math.max(0, window.scrollY / (config.distance * rem)));
      const eased = linear * linear * (3 - 2 * linear);
      // offsetTop is where the CSS centers it in the hero; it ends `end` from the top.
      const y = lerp(0, config.end * rem - el.offsetTop, eased);
      el.style.translate = `0 ${y.toFixed(2)}px`;
      el.style.scale = lerp(1, config.scale, eased).toFixed(4);
      // Once it has started shrinking, a click goes back to the top instead.
      shrunk.current = linear > 0.1;
    };
    const request = () => {
      frame ||= requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, [logoRef]);

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    if (shrunk.current) {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      return;
    }
    const next = !orbitingRef.current;
    orbitingRef.current = next;
    setOrbiting(next);
    window.dispatchEvent(new CustomEvent(ORBIT_EVENT, { detail: next }));
  };

  return (
    <h1 className="site-logo" ref={logoRef}>
      <a href="/" aria-label="Hard Launch" role="button" aria-pressed={orbiting} ref={hitRef} onClick={toggle} onPointerEnter={onHoverSfx} onPointerLeave={onHoverOffSfx}>
        <img src="/assets/hero/logo.svg" alt="" draggable={false} ref={targetRef} />
      </a>
    </h1>
  );
}
