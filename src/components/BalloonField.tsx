import { useEffect, useRef, type RefObject } from "react";
import { BalloonWorld, type Body } from "../lib/balloons";
import { balloons } from "../lib/companies";
import { INTRO, introAssetsReady, isIntroPending, pop } from "../lib/intro";

const FIGMA_WIDTH = 1728;
const MAX_RISE_DELAY = 0.22; // seconds between the first and last balloon leaving
const PHONE_MAX_RISE_DELAY = 0.08;
const PHONE_RISE_RATE = 1.4; // how much faster the balloons rise on phones
const PHONE_LOGO_COLUMN = 156; // half-width of the path the centered logo rises through
const PHONE_BELOW_LOGO_DELAY = 0.45; // seconds

type Props = {
  heroRef: RefObject<HTMLElement | null>;
  logoRef: RefObject<HTMLElement | null>;
};

export function BalloonField({ heroRef, logoRef }: Props) {
  const elements = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const hero = heroRef.current;
    const logo = logoRef.current;
    if (!hero || !logo) return;

    const world = new BalloonWorld();
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const unitSize = () => parseFloat(getComputedStyle(root).fontSize) / 10;
    const balloonScale = () =>
      parseFloat(getComputedStyle(hero).getPropertyValue("--balloon-scale")) || 1;

    // The logo is fixed and shrinks on scroll, so the collider has to follow it.
    const syncLogo = () => {
      const unit = world.unit;
      const heroRect = hero.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();
      const h = logoRect.height / unit;
      world.logo = {
        x: (logoRect.left - heroRect.left) / unit,
        y: (logoRect.top - heroRect.top) / unit,
        w: logoRect.width / unit,
        h,
        r: h * 0.3,
      };
    };

    const measure = () => {
      const unit = unitSize();
      const heroRect = hero.getBoundingClientRect();
      const nextWidth = heroRect.width / unit;
      const ratio = nextWidth / world.width;
      if (world.bodies.length && Number.isFinite(ratio)) {
        for (const b of world.bodies) b.x *= ratio;
      }
      world.unit = unit;
      world.width = nextWidth;
      world.height = heroRect.height / unit;
      syncLogo();
    };

    measure();
    const scale = balloonScale();
    const phone = scale < 1;
    const yScale = phone ? 0.6 : 1;
    balloons.forEach((def, i) => {
      const el = elements.current[i];
      if (!el) return;
      const w = def.w * scale;
      const h = def.h * scale;
      const r = ((w + h) / 2) * 0.5;
      const body: Body = {
        x: ((def.x + def.w / 2) / FIGMA_WIDTH) * world.width,
        y: (def.y + def.h / 2) * yScale,
        vx: 0,
        vy: 0,
        r,
        w,
        h,
        rot: 0,
        phase: (i + 1) * 1.73,
        rest: r + ((i * 37) % 5) * 7 * scale,
        el,
      };
      world.add(body);
    });

    // Intro: scatter the balloons around the centered logo.
    const intro = isIntroPending();
    const homes = world.bodies.map((b) => ({ x: b.x, y: b.y }));
    const riseDelays: number[] = [];
    if (intro) {
      const { w, x } = world.logo;
      const offsets = balloons.map((def) => (phone ? def.scatterPhone : def.scatter));
      const centerY = (window.innerHeight / 2 - hero.getBoundingClientRect().top) / world.unit;
      const heights = offsets.map(([, dy]) => dy);
      const top = Math.min(...heights);
      const span = Math.max(...heights) - top;
      world.bodies.forEach((b, i) => {
        const [dx, dy] = offsets[i];
        b.x = x + w / 2 + dx;
        b.y = centerY + dy;
        b.rot = Math.sin(b.phase * 3) * 14;
        // The highest balloons leave first, so nothing rises into one still waiting.
        riseDelays[i] = ((dy - top) / span) * (phone ? PHONE_MAX_RISE_DELAY : MAX_RISE_DELAY);
        // On phones, balloons directly below the logo wait for it to lift out of their way.
        if (phone && dy > 0 && Math.abs(dx) < PHONE_LOGO_COLUMN) riseDelays[i] = PHONE_BELOW_LOGO_DELAY;
      });
    }

    world.render();
    hero.dataset.balloons = "ready";

    if (reduced) {
      const onResize = () => {
        measure();
        world.render();
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    // Pointer tracking: page-wide so a fast sweep into the hero still registers.
    let lastMove = performance.now();
    const toWorld = (e: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / world.unit,
        y: (e.clientY - rect.top) / world.unit,
        inside: e.clientY >= rect.top && e.clientY <= rect.bottom,
      };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && !world.grabbed) return;
      const now = performance.now();
      const p = toWorld(e);
      world.movePointer(p.x, p.y, (now - lastMove) / 1000, p.inside);
      lastMove = now;
    };
    const onDown = (e: PointerEvent) => {
      const index = elements.current.indexOf(e.currentTarget as HTMLDivElement);
      const body = world.bodies[index];
      if (!body) return;
      e.preventDefault();
      const p = toWorld(e);
      world.movePointer(p.x, p.y, 0, true);
      world.pointer.vx = 0;
      world.pointer.vy = 0;
      world.grab(body);
      body.el.setPointerCapture(e.pointerId);
      root.classList.add("is-grabbing");
    };
    const onUp = () => {
      if (!world.grabbed) return;
      world.release();
      root.classList.remove("is-grabbing");
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    elements.current.forEach((el) => el?.addEventListener("pointerdown", onDown));

    const resizeObserver = new ResizeObserver(() => {
      measure();
      world.render();
    });
    resizeObserver.observe(hero);

    // Only simulate while the hero is on screen.
    let raf = 0;
    let holding = intro; // Stay pinned around the logo until the intro lets go.
    let last = performance.now();
    const frame = (now: number) => {
      syncLogo();
      world.step((now - last) / 1000);
      last = now;
      world.render();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf || holding) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    });
    visibility.observe(hero);

    let cancelled = false;
    let releaseTimer = 0;
    const pops: Animation[] = [];
    if (intro) {
      introAssetsReady().then(() => {
        if (cancelled) return;
        elements.current.forEach((el, i) => {
          const img = el?.querySelector("img");
          if (img) pops.push(pop(img, INTRO.balloonPop + i * INTRO.balloonStagger, 0.5, 640));
        });
        releaseTimer = window.setTimeout(() => {
          holding = false;
          world.bodies.forEach((b, i) =>
            world.launch(b, homes[i].x, homes[i].y, riseDelays[i], phone ? PHONE_RISE_RATE : 1),
          );
          start();
        }, phone ? INTRO.phoneBalloonRise : INTRO.lift);
      });
    }

    return () => {
      cancelled = true;
      clearTimeout(releaseTimer);
      pops.forEach((animation) => animation.cancel());
      stop();
      visibility.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      elements.current.forEach((el) => el?.removeEventListener("pointerdown", onDown));
      root.classList.remove("is-grabbing");
    };
  }, [heroRef, logoRef]);

  return (
    <div className="balloons" aria-hidden="true">
      {balloons.map((def, i) => (
        <div
          key={def.id}
          ref={(el) => {
            elements.current[i] = el;
          }}
          className="balloon"
          style={{
            width: `calc(${def.w / 10}rem * var(--balloon-scale))`,
            height: `calc(${def.h / 10}rem * var(--balloon-scale))`,
          }}
        >
          <img src={def.src} alt="" draggable={false} />
        </div>
      ))}
    </div>
  );
}
