import { useEffect, useRef } from "react";
import mark from "../assets/footer-hl.svg";
import { onHoverOffSfx, onHoverSfx } from "../lib/sfx";
import { Clouds } from "./Clouds";

// The end of the page: the white of the directory dissolves back into the
// hero's blue through the same clouds, turned upside down, with the big HL
// mark and a sign-off sitting on the bottom edge.
export function Footer() {
  const note = useRef<HTMLParagraphElement>(null);

  // The sign-off fades in, sharpening from a blur like the rest of the site's
  // text, the first time it scrolls into view (the fade itself is in styles.css).
  useEffect(() => {
    const el = note.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.shown = "";
        observer.disconnect();
      },
      // Not until it's a little way up from the bottom of the screen.
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-clouds">
        <Clouds />
      </div>
      <div className="riso-grain" aria-hidden="true" />
      <div className="footer-content">
        <div className="footer-mark" aria-hidden="true">
          <img src={mark} alt="" draggable={false} />
        </div>
        <p className="footer-note" ref={note}>
          More coming soon
          <a
            href="https://x.com/hardlaunching"
            target="_blank"
            rel="noopener noreferrer"
            onPointerEnter={onHoverSfx}
            onPointerLeave={onHoverOffSfx}
          >
            @hardlaunching
          </a>
        </p>
      </div>
    </footer>
  );
}
