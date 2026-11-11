import { useRef, type RefObject } from "react";
import { BalloonField } from "./BalloonField";
import { SoundToggle } from "./SoundToggle";
import { Socials } from "./Socials";
import { Tagline } from "./Tagline";

export function Hero({ logoRef }: { logoRef: RefObject<HTMLElement | null> }) {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section id="top" className="hero" ref={heroRef}>
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-white" aria-hidden="true" />
      <div className="hero-content">
        <Socials />
        <Tagline />
      </div>
      <SoundToggle />
      <BalloonField heroRef={heroRef} logoRef={logoRef} />
    </section>
  );
}
