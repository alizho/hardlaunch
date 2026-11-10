import { useLayoutEffect, type RefObject } from "react";
import { useFollow } from "../lib/useFollow";

// All lengths are in rem (1rem = 10 design px). `end` matches the side menu's margin.
const DESKTOP = { start: 9.629, end: 2.4, scale: 0.46, distance: 30 };
const PHONE = { start: 11.5, end: 1.2, scale: 0.56, distance: 16 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function StickyLogo({ logoRef }: { logoRef: RefObject<HTMLHeadingElement | null> }) {
  const { hitRef, targetRef } = useFollow<HTMLAnchorElement, HTMLImageElement>(0.5);

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
      const y = lerp(config.start, config.end, eased) * rem;
      const scale = lerp(1, config.scale, eased);
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(apply);
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

  return (
    <h1 className="site-logo" ref={logoRef}>
      <a href="#top" aria-label="Hard Launch, back to top" ref={hitRef}>
        <img src="/assets/hero/logo.svg" alt="" draggable={false} ref={targetRef} />
      </a>
    </h1>
  );
}
