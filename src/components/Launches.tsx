import { useEffect, useRef, type PointerEvent } from "react";
import { launches, type Launch } from "../lib/companies";
import { playRowHover, playRowHoverOff } from "../lib/sfx";

// How the hovered row's outline moves between rows. Its top and bottom edges
// are two springs. The edge facing the way the cursor is going is stiffer, so it
// gets there first and the outline stretches, then the other edge catches up.
const OUTLINE = {
  lead: 520, // stiffness of the leading edge; higher gets there faster
  trail: 150, // stiffness of the trailing edge; lower stretches longer
  leadDamping: 0.72, // below 1 overshoots a little before settling, 1 doesn't
  trailDamping: 0.9,
  // The cursor's speed is handed to the leading edge, so a fast flick stretches
  // further than a slow move. `kick` is the share of that speed it gets, and
  // `maxKick` the most it can get, in px per second.
  kick: 0.45,
  maxKick: 2600,
  minHeight: 12, // px; the edges never get closer than this
};

// The directory's entrance. The stagger is in ms; how long each row's fade takes
// is --fade under .launch-row in styles.css.
const ROW_STAGGER = 80; // between rows that scroll into view at the same time
const REVEAL_INSET = 8; // % of the screen's height a row must clear before it shows

type Edge = { at: number; speed: number; goal: number };

// Each row opens the company's launch post in a new tab.
function Row({
  launch,
  onEnter,
}: {
  launch: Launch;
  onEnter: (e: PointerEvent<HTMLLIElement>) => void;
}) {
  return (
    <li className="launch-row" onPointerEnter={onEnter}>
      <a
        className="launch-head"
        style={{ minHeight: `calc(${launch.h / 10}rem + 3.5248rem)` }}
        href={launch.link}
        target="_blank"
        rel="noreferrer"
      >
        <span className="launch-logo" style={{ width: `${launch.w / 10}rem`, height: `${launch.h / 10}rem` }}>
          <img src={launch.logo} alt="" draggable={false} />
        </span>
        <span className="launch-name" style={{ color: launch.color }}>{launch.name}</span>
        <span className="launch-year">{launch.year}</span>
      </a>
    </li>
  );
}

export function Launches() {
  const section = useRef<HTMLElement>(null);
  const outline = useRef<HTMLLIElement>(null);

  // One dotted outline for the whole list. It fades in around the first row the
  // mouse reaches, springs to each row after that, and fades out when the mouse
  // leaves the list.
  const motion = useRef({
    top: { at: 0, speed: 0, goal: 0 } as Edge,
    bottom: { at: 0, speed: 0, goal: 0 } as Edge,
    direction: 0, // 1 while heading down the list, -1 heading up
    raf: 0,
    last: 0,
    // The cursor's vertical speed, in px per second, and when it was measured.
    pointer: { y: 0, t: 0, speed: 0 },
  });

  const draw = () => {
    const el = outline.current;
    const { top, bottom } = motion.current;
    if (!el) return;
    el.style.setProperty("--y", `${top.at.toFixed(2)}px`);
    el.style.setProperty("--h", `${(bottom.at - top.at).toFixed(2)}px`);
  };

  const tick = (now: number) => {
    const m = motion.current;
    // Small fixed steps keep the springs stable when a frame runs long.
    let remaining = Math.min((now - m.last) / 1000, 0.05);
    m.last = now;
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 240);
      remaining -= dt;
      for (const edge of [m.top, m.bottom]) {
        const leading = edge === (m.direction > 0 ? m.bottom : m.top);
        const stiffness = leading ? OUTLINE.lead : OUTLINE.trail;
        const damping = 2 * Math.sqrt(stiffness) * (leading ? OUTLINE.leadDamping : OUTLINE.trailDamping);
        edge.speed += (stiffness * (edge.goal - edge.at) - damping * edge.speed) * dt;
        edge.at += edge.speed * dt;
      }
      // The edges can't cross or pinch shut.
      if (m.bottom.at - m.top.at < OUTLINE.minHeight) {
        if (m.direction > 0) m.top.at = m.bottom.at - OUTLINE.minHeight;
        else m.bottom.at = m.top.at + OUTLINE.minHeight;
      }
    }
    const settled = [m.top, m.bottom].every(
      (edge) => Math.abs(edge.goal - edge.at) < 0.1 && Math.abs(edge.speed) < 2,
    );
    if (settled) {
      for (const edge of [m.top, m.bottom]) {
        edge.at = edge.goal;
        edge.speed = 0;
      }
    }
    draw();
    m.raf = settled ? 0 : requestAnimationFrame(tick);
  };

  const trackPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const { pointer } = motion.current;
    const now = performance.now();
    const dt = (now - pointer.t) / 1000;
    // Averaged with the last reading, so one jittery event doesn't decide it.
    if (dt > 0 && dt < 0.1) pointer.speed = (pointer.speed + (e.clientY - pointer.y) / dt) / 2;
    else pointer.speed = 0;
    pointer.y = e.clientY;
    pointer.t = now;
  };

  const enterRow = (e: PointerEvent<HTMLLIElement>) => {
    const el = outline.current;
    if (e.pointerType !== "mouse" || !el) return;
    const m = motion.current;
    const row = e.currentTarget;
    const top = row.offsetTop;
    const arriving = !("active" in el.dataset);
    m.direction = Math.sign(top - m.top.goal);
    m.top.goal = top;
    m.bottom.goal = top + row.offsetHeight;
    if (arriving || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Arriving from outside the list: jump to the row rather than slide from the last one.
      for (const edge of [m.top, m.bottom]) {
        edge.at = edge.goal;
        edge.speed = 0;
      }
      draw();
    } else {
      // A cursor that has paused isn't moving, whatever its last reading said.
      const speed = performance.now() - m.pointer.t < 80 ? m.pointer.speed : 0;
      const kick = Math.max(-OUTLINE.maxKick, Math.min(OUTLINE.maxKick, speed * OUTLINE.kick));
      if (Math.sign(kick) === m.direction) (m.direction > 0 ? m.bottom : m.top).speed += kick;
      if (!m.raf) {
        m.last = performance.now();
        m.raf = requestAnimationFrame(tick);
      }
    }
    el.dataset.active = "";
    playRowHover();
  };

  const leaveList = (e: PointerEvent) => {
    const el = outline.current;
    if (e.pointerType !== "mouse" || !el || !("active" in el.dataset)) return;
    delete el.dataset.active;
    playRowHoverOff();
  };

  useEffect(() => () => cancelAnimationFrame(motion.current.raf), []);

  // The entrance. Each row fades in as it scrolls into view (that part is in
  // styles.css). Rows that come into view together are staggered from the top down.
  // The first row peeks up into the hero (--peek in styles.css), so it comes
  // in as soon as the intro has finished, as the cue to scroll.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const root = document.documentElement;
    const reveal = (observer: IntersectionObserver) => (entries: IntersectionObserverEntry[]) => {
      let arrived = 0;
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting || !(target instanceof HTMLElement)) continue;
        observer.unobserve(target);
        target.style.setProperty("--delay", `${arrived++ * ROW_STAGGER}ms`);
        target.dataset.shown = "";
      }
    };
    // The peeking one shows the moment any part of it is on screen. The rest
    // wait until they're a little way up from the bottom of it.
    const peeking: IntersectionObserver = new IntersectionObserver((entries) => reveal(peeking)(entries));
    const rest: IntersectionObserver = new IntersectionObserver((entries) => reveal(rest)(entries), {
      rootMargin: `0px 0px -${REVEAL_INSET}% 0px`,
    });
    const watch = () => {
      el.querySelectorAll(".launch-row").forEach((item, i) => (i < 1 ? peeking : rest).observe(item));
    };
    // Nothing comes in while the intro is still playing over it.
    const unlocked = new MutationObserver(() => {
      if (root.classList.contains("intro-lock")) return;
      unlocked.disconnect();
      watch();
    });
    if (root.classList.contains("intro-lock")) unlocked.observe(root, { attributes: true, attributeFilter: ["class"] });
    else watch();
    return () => {
      unlocked.disconnect();
      peeking.disconnect();
      rest.disconnect();
    };
  }, []);

  return (
    <section id="launches" className="launches" ref={section}>
      <div className="launches-table">
        <ul className="launch-list" onPointerMove={trackPointer} onPointerLeave={leaveList}>
          {launches.map((launch) => (
            <Row key={launch.id} launch={launch} onEnter={enterRow} />
          ))}
          <li className="launch-outline" ref={outline} aria-hidden="true">
            <svg>
              <rect />
            </svg>
          </li>
        </ul>
      </div>
    </section>
  );
}
