import { useEffect, useRef, type RefObject } from "react";
import { BalloonField } from "./BalloonField";
import { Clouds } from "./Clouds";
import { ScrollArrow } from "./ScrollArrow";
import { Socials } from "./Socials";
import { Tagline } from "./Tagline";

// Scrolling this share of the hero's height fades the buttons and text out fully.
const FADE_OVER = 0.6;
// They blur as they fade, up to this many px by the time they're gone.
const FADE_BLUR = 14;

export function Hero({ logoRef }: { logoRef: RefObject<HTMLElement | null> }) {
  const heroRef = useRef<HTMLElement>(null);

  // Scroll parallax: the buttons and tagline each lag behind the page by a
  // different amount (set in styles.css) and fade as the hero scrolls away.
  // The logo has its own scroll behavior (see Logo.tsx).
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const height = hero.offsetHeight;
      // Nothing changes once the hero is off screen.
      const scroll = Math.min(Math.max(window.scrollY, 0), height);
      if (scroll === last) return;
      last = scroll;
      const fade = Math.max(0, 1 - scroll / (height * FADE_OVER));
      hero.style.setProperty("--scroll", String(scroll));
      hero.style.setProperty("--scroll-fade", String(fade));
      // No filter at all while fully sharp or fully gone, so it costs nothing then.
      if (fade > 0 && fade < 1) {
        hero.style.setProperty("--scroll-filter", `blur(${((1 - fade) * FADE_BLUR).toFixed(2)}px)`);
      } else {
        hero.style.removeProperty("--scroll-filter");
      }
    };
    const onScroll = () => {
      raf ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      hero.style.removeProperty("--scroll");
      hero.style.removeProperty("--scroll-fade");
      hero.style.removeProperty("--scroll-filter");
    };
  }, []);

  return (
    <section id="top" className="hero" ref={heroRef}>
      <div className="hero-bg" aria-hidden="true" />
      <Clouds />
      <div className="riso-grain" aria-hidden="true" />
      <div className="hero-content">
        <Socials />
        <Tagline />
      </div>
      <ScrollArrow />
      <BalloonField heroRef={heroRef} logoRef={logoRef} />
    </section>
  );
}
