import { useLayoutEffect, useRef, type RefObject } from "react";
import { useFollow } from "../lib/useFollow";
import { BalloonField } from "./BalloonField";
import { HeroThumbnails } from "./CyclingMedia";

// The background covers this fraction of the scroll distance less than the
// content does, so the blue lingers while the content moves past it.
const BACKGROUND_LAG = 0.4;

function AllLaunchesButton() {
  const { hitRef, targetRef } = useFollow<HTMLDivElement, HTMLAnchorElement>(0.4);
  return (
    <div className="all-launches-hit" ref={hitRef}>
      <a className="all-launches" href="#launches" ref={targetRef}>
        all launches
      </a>
    </div>
  );
}

export function Hero({ logoRef, revealed }: { logoRef: RefObject<HTMLElement | null>; revealed: boolean }) {
  const heroRef = useRef<HTMLElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    const background = backgroundRef.current;
    if (!hero || !background) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const scrolled = Math.min(Math.max(window.scrollY, 0), hero.offsetHeight);
      background.style.transform = `translate3d(0, ${(scrolled * BACKGROUND_LAG).toFixed(1)}px, 0)`;
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
  }, []);

  return (
    <section id="top" className="hero" ref={heroRef}>
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-white" ref={backgroundRef} aria-hidden="true" />
      <p className="tagline">
        We get the world rooting for you through
        <br />
        design, sites, videos, events, &amp; marketing
      </p>
      <div className="hero-grid">
        <HeroThumbnails revealed={revealed} />
        <AllLaunchesButton />
      </div>
      <BalloonField heroRef={heroRef} logoRef={logoRef} />
    </section>
  );
}
