import { useLayoutEffect, type MouseEvent, type RefObject } from "react";
import { useFollow } from "../lib/useFollow";
import { onHoverOffSfx, onHoverSfx } from "../lib/sfx";
import { shineLogo } from "../lib/shine";

// What the balloons do once the intro lets them go:
//   "orbit": they circle the logo and text at the top of the page, float up
//            when it scrolls, and circle again when it scrolls back.
//   "float": they rise to the top and float there, whatever the scroll.
export const BALLOON_DEFAULT: "orbit" | "float" = "orbit";

// Scrolling shrinks the logo into the top of the screen, where it stays. Where
// it ends up, how small, and over how much scrolling are --logo-end,
// --logo-scale and --logo-distance in styles.css. Browsers that can tie an
// animation to scrolling do the whole thing in CSS, in step with the page.
// The others get this instead: the same motion, set from scroll events.
const cssDrivesScroll = () => CSS.supports("animation-timeline: scroll()");

export function Logo({ logoRef }: { logoRef: RefObject<HTMLHeadingElement | null> }) {
  const { hitRef, targetRef } = useFollow<HTMLAnchorElement, HTMLSpanElement>(0.5);

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

  // A click goes back to the top of the page, and light crosses the logo
  // (see lib/shine.ts).
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    shineLogo();
  };

  return (
    <h1 className="site-logo" ref={logoRef}>
      <a href="/" aria-label="Hard Launch" ref={hitRef} onClick={onClick} onPointerEnter={onHoverSfx} onPointerLeave={onHoverOffSfx}>
        {/* The art and the light over it lean toward the cursor together. */}
        <span className="logo-art" ref={targetRef}>
          <img src="/assets/hero/logo.svg" alt="" draggable={false} />
          <span className="logo-shine" aria-hidden="true">
            <span />
            <span />
          </span>
        </span>
      </a>
    </h1>
  );
}
