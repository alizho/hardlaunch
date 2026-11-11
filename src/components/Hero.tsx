import { useRef, type RefObject } from "react";
import { BalloonField } from "./BalloonField";
import { Tagline } from "./Tagline";

export function Hero({ logoRef }: { logoRef: RefObject<HTMLElement | null> }) {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section id="top" className="hero" ref={heroRef}>
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-white" aria-hidden="true" />
      <Tagline />
      <BalloonField heroRef={heroRef} logoRef={logoRef} />
    </section>
  );
}
