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

// Scrolling shrinks the logo into the top of the screen, where it stays. Where
// it ends up, how small, and over how much scrolling are --logo-end,
// --logo-scale and --logo-distance in styles.css. Browsers that can tie an
// animation to scrolling do the whole thing in CSS, in step with the page.
// The others get this instead: the same motion, set from scroll events.
const cssDrivesScroll = () => CSS.supports("animation-timeline: scroll()");

export function Logo({ logoRef }: { logoRef: RefObject<HTMLHeadingElement | null> }) {
  const { hitRef, targetRef } = useFollow<HTMLAnchorElement, HTMLImageElement>(0.5);
  const [orbiting, setOrbiting] = useState(BALLOON_DEFAULT === "orbit");
  // Read from a ref so quick repeat clicks never act on a stale state.
  const orbitingRef = useRef(orbiting);

  useLayoutEffect(() => {
    const el = logoRef.current;
    if (!el || cssDrivesScroll()) return;
    let frame = 0;
    // Measured up front and on resize only: reading layout while scrolling is
    // what makes scroll-linked motion stutter on phones.
    let distance = 1;
    let travel = 0;
    let scale = 1;

    const measure = () => {
      const style = getComputedStyle(document.documentElement);
      const rem = parseFloat(style.fontSize);
      const length = (name: string) => parseFloat(style.getPropertyValue(name)) * rem;
      distance = length("--logo-distance");
      // offsetTop is where the CSS centers it in the hero.
      travel = length("--logo-end") - el.offsetTop;
      scale = parseFloat(style.getPropertyValue("--logo-scale"));
      apply();
    };
    const apply = () => {
      frame = 0;
      const linear = Math.min(1, Math.max(0, window.scrollY / distance));
      const eased = linear * linear * (3 - 2 * linear);
      el.style.transform = `translate3d(0, ${(travel * eased).toFixed(2)}px, 0) scale(${(1 + (scale - 1) * eased).toFixed(4)})`;
    };
    const request = () => {
      frame ||= requestAnimationFrame(apply);
    };

    measure();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", measure);
      el.style.transform = "";
    };
  }, [logoRef]);

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    // Once the page has scrolled and the logo has started shrinking, a click
    // goes back to the top instead.
    if (window.scrollY > window.innerHeight * 0.05) {
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
