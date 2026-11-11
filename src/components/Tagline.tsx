import { Fragment, useEffect, useRef, useState, type PointerEvent } from "react";
import designImg from "../assets/examples/des.png";
import sitesImg from "../assets/examples/sites.png";
import videosImg from "../assets/examples/video.png";
import eventsImg from "../assets/examples/events.png";
import marketingImg from "../assets/examples/marketing.png";
import { measureUnderline, UNDERLINE_OFFSET, UNDERLINE_THICKNESS, type Underline } from "../lib/underline";

// Tagline words that show an example image below them on hover.
const keywords = [
  { word: "videos", image: videosImg },
  { word: "design", image: designImg },
  { word: "sites", image: sitesImg },
  { word: "events", image: eventsImg },
  { word: "marketing", image: marketingImg },
];

// How far the image leans toward the cursor, as a share of the cursor's
// distance from the word's center, and the most it can move (px).
const FOLLOW = 0.14;
const FOLLOW_MAX = 18;
// Smoothing per frame for the follow; lower is lazier.
const FOLLOW_EASE = 0.12;
// Grace period when leaving a word, so moving to the next one switches
// instead of closing and reopening.
const CLOSE_DELAY = 90;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Tagline() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const probeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [underlines, setUnderlines] = useState<(Underline | null)[]>([]);
  const openRef = useRef(false);
  const closeTimer = useRef<number>(0);

  // Cursor follow: eased toward a target offset in a rAF loop that
  // stops once it settles.
  const follow = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0 });

  const tick = () => {
    const f = follow.current;
    f.x += (f.tx - f.x) * FOLLOW_EASE;
    f.y += (f.ty - f.y) * FOLLOW_EASE;
    if (Math.abs(f.tx - f.x) < 0.05 && Math.abs(f.ty - f.y) < 0.05) {
      f.x = f.tx;
      f.y = f.ty;
      f.raf = 0;
    } else {
      f.raf = requestAnimationFrame(tick);
    }
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${f.x}px, ${f.y}px, 0)`;
    }
  };

  const setFollowTarget = (tx: number, ty: number) => {
    const f = follow.current;
    f.tx = tx;
    f.ty = ty;
    if (!f.raf) f.raf = requestAnimationFrame(tick);
  };

  // Underlines need the real font loaded to find the descenders, and a
  // remeasure when the layout switches between phone and desktop.
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const measure = () => {
      if (cancelled) return;
      setUnderlines(
        wordRefs.current.map((word, i) => {
          const probe = probeRefs.current[i];
          return word && probe ? measureUnderline(word, probe) : null;
        }),
      );
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    document.fonts.ready.then(measure);
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(follow.current.raf);
    clearTimeout(closeTimer.current);
  }, []);

  const show = (index: number) => {
    clearTimeout(closeTimer.current);
    const word = wordRefs.current[index];
    const preview = previewRef.current;
    if (!word || !preview) return;

    // Size the frame to this image's proportions.
    const img = preview.querySelectorAll("img")[index];
    if (img?.naturalWidth) {
      preview.style.setProperty("--ratio", String(img.naturalHeight / img.naturalWidth));
    }

    // Anchor under the word's center.
    const x = word.offsetLeft + word.offsetWidth / 2;
    const y = word.offsetTop + word.offsetHeight;
    if (!openRef.current) {
      // Opening: jump to the word, then pop in. Only slide between words.
      preview.dataset.instant = "";
      preview.style.setProperty("--x", `${x}px`);
      preview.style.setProperty("--y", `${y}px`);
      void preview.offsetWidth;
      delete preview.dataset.instant;
    } else {
      preview.style.setProperty("--x", `${x}px`);
      preview.style.setProperty("--y", `${y}px`);
    }

    openRef.current = true;
    setActive(index);
    setOpen(true);
  };

  const hide = (delay = CLOSE_DELAY) => {
    clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      openRef.current = false;
      setOpen(false);
      setFollowTarget(0, 0);
    }, delay);
  };

  const onMove = (index: number, e: PointerEvent) => {
    if (e.pointerType !== "mouse" || reducedMotion()) return;
    const rect = wordRefs.current[index]!.getBoundingClientRect();
    const clamp = (v: number) => Math.max(-FOLLOW_MAX, Math.min(FOLLOW_MAX, v));
    setFollowTarget(
      clamp((e.clientX - (rect.left + rect.width / 2)) * FOLLOW),
      clamp((e.clientY - (rect.top + rect.height / 2)) * FOLLOW),
    );
  };

  return (
    <p className="tagline">
      We get the world rooting for you through
      <br />
      {keywords.map(({ word }, i) => (
        <Fragment key={word}>
          <span
            className="keyword"
            tabIndex={0}
            ref={(el) => {
              wordRefs.current[i] = el;
            }}
            onPointerEnter={(e) => e.pointerType === "mouse" && show(i)}
            onPointerMove={(e) => onMove(i, e)}
            onPointerLeave={(e) => {
              if (e.pointerType !== "mouse") return;
              if (document.activeElement === e.currentTarget) e.currentTarget.blur();
              hide();
            }}
            // Keyboard and touch: tap or tab to a word to show it.
            onFocus={() => show(i)}
            onBlur={() => hide(0)}
          >
            {word}
            <span
              className="baseline-probe"
              ref={(el) => {
                probeRefs.current[i] = el;
              }}
            />
            <KeywordUnderline underline={underlines[i]} />
          </span>
          {", "}
        </Fragment>
      ))}
      &amp; whatever else it takes
      <span className="example-preview" ref={previewRef} data-open={open || undefined} aria-hidden="true">
        <span className="example-track" ref={trackRef}>
          <span className="example-pop">
            {keywords.map(({ word, image }, i) => (
              <img
                key={word}
                src={image}
                alt=""
                draggable={false}
                data-active={i === active || undefined}
              />
            ))}
          </span>
        </span>
      </span>
    </p>
  );
}

function KeywordUnderline({ underline }: { underline?: Underline | null }) {
  // Until measured: one plain line just under the text.
  const top = underline ? underline.baseline + UNDERLINE_OFFSET : 1 - UNDERLINE_THICKNESS;
  const segments = underline?.segments ?? [null];
  return (
    <span className="underline" style={{ top: `${top}em`, height: `${UNDERLINE_THICKNESS}em` }} aria-hidden="true">
      {segments.map((seg, i) => (
        <span
          key={i}
          className="underline-seg"
          style={seg ? { left: `${seg[0]}em`, width: `${seg[1] - seg[0]}em` } : { left: 0, right: 0 }}
        />
      ))}
    </span>
  );
}
