import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { mainThumbnail, sideThumbnails, type Slide, type TagColors, type Thumbnail } from "../data/content";
import { useFollow } from "../lib/useFollow";

const YEAR_COLORS: TagColors = { bg: "#82d7ff", fg: "#0089c8" };

const glowShadow = (color: string) =>
  `inset -0.1509rem 0.1509rem 1.4788rem 0 ${color}, inset 1.0563rem -0.6036rem 3.3994rem 0 rgba(255,255,255,0.74), inset 0 0.4839rem 0.4839rem 0 rgba(0,0,0,0.25), inset 0 0.6036rem 1.863rem 0 rgba(0,0,0,0.25)`;

const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useAutoAdvance(item: Thumbnail, index: number, enabled: boolean, onIndex: (next: number) => void) {
  const callback = useRef(onIndex);
  callback.current = onIndex;
  const length = item.slides.length;

  useEffect(() => {
    if (!enabled || length < 2) return;
    const timer = window.setTimeout(() => callback.current((index + 1) % length), item.durationMs);
    return () => window.clearTimeout(timer);
  }, [item.name, item.durationMs, index, length, enabled]);
}

function SlideMedia({ slide, active }: { slide: Slide; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active]);

  if (slide.kind === "image") {
    return <img className="slide-media" src={slide.src} alt={slide.caption} style={slide.imgStyle} />;
  }
  if (slide.kind === "video") {
    return (
      <video
        ref={videoRef}
        className="slide-media slide-video"
        src={slide.src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={slide.caption}
      />
    );
  }
  return (
    <div className="slide-placeholder">
      <span>{slide.label}</span>
    </div>
  );
}

function Slides({ item, index }: { item: Thumbnail; index: number }) {
  return (
    <>
      {item.slides.map((slide, i) => (
        <div key={`${item.name}-${i}`} className="slide" data-active={i === index} aria-hidden={i !== index}>
          <SlideMedia slide={slide} active={i === index} />
        </div>
      ))}
    </>
  );
}

function ParallaxFrame({
  maxRem,
  className,
  style,
  children,
}: {
  maxRem: number;
  className: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  const { hitRef, targetRef } = useFollow<HTMLDivElement, HTMLDivElement>(maxRem);
  return (
    <div className="thumb-hit" ref={hitRef}>
      <div className={className} style={style} ref={targetRef}>
        {children}
      </div>
    </div>
  );
}

function TagButton({ item, onSwap }: { item: Thumbnail; onSwap: () => void }) {
  const { hitRef, targetRef } = useFollow<HTMLSpanElement, HTMLButtonElement>(0.3);
  return (
    <span className="pill-hit" ref={hitRef}>
      <button
        type="button"
        className="tag tag-button"
        style={{ background: item.tag.bg, color: item.tag.fg }}
        aria-label={`Move ${item.name} to the large thumbnail`}
        onClick={onSwap}
        ref={targetRef}
      >
        {item.name}
      </button>
    </span>
  );
}

function Caption({ text, className }: { text: string; className: string }) {
  return (
    <p className={className}>
      <span key={text} className="caption-text">{text}</span>
    </p>
  );
}

function Tags({ item, onSwap }: { item: Thumbnail; onSwap?: () => void }) {
  const style = { background: item.tag.bg, color: item.tag.fg };
  return (
    <div className="tags">
      {onSwap ? (
        <TagButton item={item} onSwap={onSwap} />
      ) : (
        <span className="tag" style={style}>{item.name}</span>
      )}
      <span className="tag" style={{ background: YEAR_COLORS.bg, color: YEAR_COLORS.fg }}>{item.year}</span>
    </div>
  );
}

type SlotProps = {
  item: Thumbnail;
  index: number;
  autoplay: boolean;
  onIndex: (next: number) => void;
  slotRef: (el: HTMLDivElement | null) => void;
};

function MainSlot({ item, index, autoplay, onIndex, slotRef }: SlotProps) {
  useAutoAdvance(item, index, autoplay, onIndex);

  return (
    <div className="main-thumb" ref={slotRef}>
      <Tags item={item} />
      <ParallaxFrame maxRem={0.7} className="main-frame" style={{ borderColor: item.border }}>
        <Slides item={item} index={index} />
        <div className="thumb-glow" style={{ boxShadow: glowShadow(item.glow) }} />
      </ParallaxFrame>
      <div className="progress" style={{ "--duration": `${item.durationMs}ms` } as CSSProperties}>
        {item.slides.map((slide, i) => (
          <button
            key={`${item.name}-${i}`}
            type="button"
            className="progress-segment"
            data-state={i < index ? "done" : i === index ? "active" : "todo"}
            aria-label={`Show ${slide.caption}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => onIndex(i)}
          >
            <span key={i === index ? `active-${index}` : "idle"} className="progress-fill" />
          </button>
        ))}
      </div>
      <Caption text={item.slides[index].caption} className="main-caption" />
    </div>
  );
}

function SideSlot({ item, index, autoplay, onIndex, slotRef, onSwap }: SlotProps & { onSwap: () => void }) {
  useAutoAdvance(item, index, autoplay, onIndex);

  return (
    <div className="side-thumb" ref={slotRef}>
      <Tags item={item} onSwap={onSwap} />
      <ParallaxFrame maxRem={0.5} className="side-frame" style={{ borderColor: item.border }}>
        <div className="side-slides">
          <Slides item={item} index={index} />
        </div>
        <div className="thumb-glow" style={{ boxShadow: glowShadow(item.glow) }} />
      </ParallaxFrame>
      <Caption text={item.slides[index].caption} className="side-caption" />
    </div>
  );
}

const POP_OUT: Keyframe[] = [
  { opacity: 1, transform: "scale(1)" },
  { opacity: 0, transform: "scale(0.95)" },
];
const POP_IN: Keyframe[] = [
  { opacity: 0, transform: "scale(0.95)" },
  { opacity: 1, transform: "scale(1)" },
];
const SPRING = "linear(0, 0.18 5%, 0.56 12%, 0.92 20%, 1.12 28%, 1.16 33%, 1.13 40%, 1.03 52%, 0.98 62%, 0.99 78%, 1)";
const popInEasing = () =>
  CSS.supports("transition-timing-function", "linear(0, 1)") ? SPRING : "cubic-bezier(0.34, 1.4, 0.64, 1)";

const imagesReady = (el: HTMLElement) =>
  Promise.all([...el.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));

// One owner for which project sits in which slot and which slide each project
// is on, so a swap exchanges everything in a single state update.
export function HeroThumbnails({ revealed }: { revealed: boolean }) {
  const [order, setOrder] = useState<Thumbnail[]>(() => [mainThumbnail, ...sideThumbnails]);
  const [slideOf, setSlideOf] = useState<Record<string, number>>({});
  const [swapping, setSwapping] = useState(false);
  const reduced = useReducedMotion();
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const busy = useRef(false);

  const setSlide = (name: string, next: number) => setSlideOf((s) => ({ ...s, [name]: next }));

  const swapWithMain = async (sideSlot: number) => {
    if (busy.current) return;
    const elements = [slots.current[0], slots.current[sideSlot]].filter(Boolean) as HTMLDivElement[];
    const exchange = () =>
      setOrder((current) => {
        const next = [...current];
        [next[0], next[sideSlot]] = [next[sideSlot], next[0]];
        return next;
      });

    if (reduced) {
      exchange();
      return;
    }

    busy.current = true;
    setSwapping(true);
    try {
      const out = elements.map((el) =>
        el.animate(POP_OUT, { duration: 130, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }),
      );
      await Promise.all(out.map((animation) => animation.finished));

      // Swap while both slots are invisible, and wait for the images so nothing
      // pops in half-decoded.
      flushSync(exchange);
      await Promise.all(elements.map(imagesReady));

      const easing = popInEasing();
      const back = elements.map((el) => el.animate(POP_IN, { duration: 360, easing, fill: "backwards" }));
      out.forEach((animation) => animation.cancel());
      await Promise.all(back.map((animation) => animation.finished));
    } finally {
      busy.current = false;
      setSwapping(false);
    }
  };

  const slotProps = (slot: number): SlotProps => {
    const item = order[slot];
    return {
      item,
      index: slideOf[item.name] ?? 0,
      autoplay: revealed && !reduced && !swapping,
      onIndex: (next) => setSlide(item.name, next),
      slotRef: (el) => {
        slots.current[slot] = el;
      },
    };
  };

  return (
    <>
      <MainSlot {...slotProps(0)} />
      <div className="side-column">
        {order.slice(1).map((_, i) => (
          <SideSlot key={i + 1} {...slotProps(i + 1)} onSwap={() => swapWithMain(i + 1)} />
        ))}
      </div>
    </>
  );
}
