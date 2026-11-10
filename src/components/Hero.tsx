import { useRef, type RefObject } from "react";
import { BalloonField } from "./BalloonField";

export function Hero({ logoRef }: { logoRef: RefObject<HTMLElement | null> }) {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section id="top" className="hero" ref={heroRef}>
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-white" aria-hidden="true" />
      <p className="tagline">
        We get the world rooting for you through
        <br />
        design, sites, videos, events, &amp; marketing
      </p>
      <BalloonField heroRef={heroRef} logoRef={logoRef} />
    </section>
  );
}
