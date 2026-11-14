import { useEffect, useRef, type RefObject } from "react";
import { BalloonField } from "./BalloonField";
import { Clouds } from "./Clouds";
import { ScrollArrow } from "./ScrollArrow";
import { Socials } from "./Socials";
import { Tagline } from "./Tagline";

export function Hero({ logoRef }: { logoRef: RefObject<HTMLElement | null> }) {
  const heroRef = useRef<HTMLElement>(null);

  // As the hero scrolls away, the buttons and tagline each lag behind the page
  // by a different amount and fade out. The amounts are --parallax-*,
  // --hero-fade-over and --hero-fade-blur in styles.css. Browsers that can tie
  // an animation to scrolling do it all in CSS, in step with the page; the
  // others get this instead. The logo has its own scroll behavior (see Logo.tsx).
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || CSS.supports("animation-timeline: scroll()")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const find = (selector: string) => hero.querySelector<HTMLElement>(selector);
    const fading = [find(".hero-content"), find(".scroll-arrow")];
    const lagging: [HTMLElement | null, string][] = [
      [find(".socials"), "--parallax-socials"],
      [find(".tagline"), "--parallax-tagline"],
    ];
    const style = getComputedStyle(document.documentElement);
    const number = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
    const fadeOver = number("--hero-fade-over");
    // "none" on touch screens, where a changing blur is too slow to keep up.
    const blur = number("--hero-fade-blur");
    const lags = lagging.map(([, name]) => number(name));

    let raf = 0;
    let last = -1;
    // Measured here and on resize, never while scrolling.
    let height = hero.offsetHeight;
    const update = () => {
      raf = 0;
      // Nothing changes once the hero is off screen.
      const scroll = Math.min(Math.max(window.scrollY, 0), height);
      if (scroll === last) return;
      last = scroll;
      const fade = Math.max(0, 1 - scroll / (height * fadeOver));
      for (const el of fading) {
        if (!el) continue;
        // Left alone at the top, where the intro decides what shows.
        el.style.opacity = scroll ? String(fade) : "";
        // No filter while fully sharp or fully gone, so it costs nothing then.
        el.style.filter = blur && fade > 0 && fade < 1 ? `blur(${((1 - fade) * blur).toFixed(2)}px)` : "";
      }
      lagging.forEach(([el], i) => {
        if (el) el.style.translate = scroll ? `0 ${(scroll * lags[i]).toFixed(2)}px` : "";
      });
    };
    const onScroll = () => {
      raf ||= requestAnimationFrame(update);
    };
    const onResize = () => {
      height = hero.offsetHeight;
      last = -1;
      onScroll();
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      for (const el of fading) {
        if (!el) continue;
        el.style.opacity = "";
        el.style.filter = "";
      }
      for (const [el] of lagging) if (el) el.style.translate = "";
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
