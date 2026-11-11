import { useEffect, useRef, type RefObject } from "react";
import { BalloonWorld, type Body } from "../lib/balloons";
import { balloons } from "../lib/companies";
import { INTRO, introAssetsReady, isIntroPending, pop } from "../lib/intro";
import type { Point } from "../data/content";
import { ORBIT_EVENT } from "./Logo";
import { onHoverOffSfx, onHoverSfx } from "../lib/sfx";

const FIGMA_WIDTH = 1728;
// The intro ring around the logo, as half-width and half-height in design px.
const RING: Point = [420, 250];
const PHONE_RING: Point = [185, 265];
// Space between the content and the oval the balloons circle on, each side, in design px.
const ORBIT_PADDING = { x: 220, y: 150 };
const PHONE_ORBIT_PADDING = { x: 60, y: 130 };
const RING_EDGE = 70; // space the ring keeps from the edges of the screen
const RING_STAGGER = 0.88; // every other balloon sits this much closer to the logo
const RING_LOGO_GAP = 6; // space a balloon keeps from the logo at the start
// How far scattered balloons can start from the logo's center, as the half-width
// and half-height of an oval in design px. Smaller keeps them closer in.
const SCATTER_REACH: Point = [560, 350];
const PHONE_SCATTER_REACH: Point = [195, 300];
const SCATTER_EDGE = 16; // space scattered balloons keep from the edges of the screen
const SCATTER_LOGO_GAP = 60; // space scattered balloons keep from the logo
const SCATTER_TRIES = 120;
// A press that moves less than this (px) and lets go within this time (ms)
// is a click, which opens the company's link, rather than a drag.
const CLICK_SLOP = 6;
const CLICK_TIME = 500; // valid spots compared per balloon; more spreads them more evenly

// Points spaced evenly by distance around an ellipse, starting half a step past
// its right edge so the top and bottom halves get the same number.
function ringSpots(count: number, rx: number, ry: number): Point[] {
  const SAMPLES = 720;
  const at = (i: number): Point => {
    const angle = (i / SAMPLES) * 2 * Math.PI;
    return [Math.cos(angle) * rx, Math.sin(angle) * ry];
  };
  const lengths = [0];
  for (let i = 1; i <= SAMPLES; i++) {
    const [ax, ay] = at(i - 1);
    const [bx, by] = at(i);
    lengths[i] = lengths[i - 1] + Math.hypot(bx - ax, by - ay);
  }
  return Array.from({ length: count }, (_, k) => {
    const distance = ((k + 0.5) / count) * lengths[SAMPLES];
    const [x, y] = at(lengths.findIndex((length) => length >= distance));
    const depth = k % 2 ? RING_STAGGER : 1;
    return [x * depth, y * depth];
  });
}

// Random spots in an oval around the logo. Each balloon tries several and keeps
// the one farthest from the balloons already placed, so they don't clump.
function scatterAroundLogo(
  bodies: Body[],
  width: number,
  height: number,
  logo: Point,
  logoSize: Point,
  [reachX, reachY]: Point,
) {
  const placed: Body[] = [];
  for (const b of bodies) {
    const clearX = logoSize[0] / 2 + b.r + SCATTER_LOGO_GAP;
    const clearY = logoSize[1] / 2 + b.r + SCATTER_LOGO_GAP;
    const inset = b.r + SCATTER_EDGE;
    let bestGap = -Infinity;
    let found = 0;
    for (let attempt = 0; found < SCATTER_TRIES && attempt < SCATTER_TRIES * 50; attempt++) {
      const dx = (Math.random() * 2 - 1) * reachX;
      const dy = (Math.random() * 2 - 1) * reachY;
      const x = logo[0] + dx;
      const y = logo[1] + dy;
      if ((dx / reachX) ** 2 + (dy / reachY) ** 2 > 1) continue;
      if (x < inset || x > width - inset || y < inset || y > height - inset) continue;
      if (Math.abs(dx) < clearX && Math.abs(dy) < clearY) continue;
      found++;
      const gap = Math.min(Infinity, ...placed.map((p) => Math.hypot(x - p.x, y - p.y) - p.r - b.r));
      if (gap > bestGap) {
        bestGap = gap;
        b.x = x;
        b.y = y;
      }
    }
    placed.push(b);
  }
}

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

    const content = hero.querySelector<HTMLElement>(".hero-content");

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
      // The orbit circles the logo, buttons, and tagline as one block.
      const contentRect = content?.getBoundingClientRect();
      const top = logoRect.top;
      const bottom = Math.max(logoRect.bottom, contentRect?.bottom ?? 0);
      const left = Math.min(logoRect.left, contentRect?.left ?? Infinity);
      const right = Math.max(logoRect.right, contentRect?.right ?? -Infinity);
      world.content = {
        x: (left - heroRect.left) / unit,
        y: (top - heroRect.top) / unit,
        w: (right - left) / unit,
        h: (bottom - top) / unit,
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
    // Clicking the logo sends the balloons circling the content.
    world.orbitPadding = phone ? PHONE_ORBIT_PADDING : ORBIT_PADDING;
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

    // Intro: space the balloons evenly around the centered logo, keeping each
    // company's `scatter` as its place in the order around the ring.
    const intro = isIntroPending();
    if (intro) {
      const { w, x } = world.logo;
      const offsets = balloons.map((def) => (phone ? def.scatterPhone : def.scatter));
      const centerY = (window.innerHeight / 2 - hero.getBoundingClientRect().top) / world.unit;
      const [ringX, ringY] = phone ? PHONE_RING : RING;
      const spots = ringSpots(
        world.bodies.length,
        Math.min(ringX, world.width / 2 - RING_EDGE),
        Math.min(ringY, centerY - RING_EDGE),
      );
      const clockwise = (i: number) => (Math.atan2(offsets[i][1], offsets[i][0]) + 2 * Math.PI) % (2 * Math.PI);
      const order = world.bodies.map((_, i) => i).sort((a, c) => clockwise(a) - clockwise(c));
      order.forEach((bodyIndex, slot) => {
        const b = world.bodies[bodyIndex];
        let [dx, dy] = spots[slot];
        // Phones have a narrower ring than the logo, so anything behind it moves to its side.
        const clearX = w / 2 + b.r + RING_LOGO_GAP;
        if (Math.abs(dx) < clearX && Math.abs(dy) < world.logo.h / 2 + b.r + RING_LOGO_GAP) {
          dx = Math.sign(dx) * clearX;
        }
        b.x = x + w / 2 + dx;
        b.y = centerY + dy;
        b.rot = Math.sin(b.phase * 3) * 14;
      });
      if (INTRO.balloonStart === "scattered") {
        const reach = phone ? PHONE_SCATTER_REACH : SCATTER_REACH;
        scatterAroundLogo(world.bodies, world.width, centerY * 2, [x + w / 2, centerY], [w, world.logo.h], reach);
      }
    }

    world.render();
    hero.dataset.balloons = "ready";

    if (reduced) {
      // No dragging here, so any click opens the link.
      const onClick = (e: MouseEvent) => {
        const link = balloons[elements.current.indexOf(e.currentTarget as HTMLDivElement)]?.link;
        if (link) window.open(link, "_blank", "noopener,noreferrer");
      };
      const onResize = () => {
        measure();
        world.render();
      };
      window.addEventListener("resize", onResize);
      elements.current.forEach((el) => el?.addEventListener("click", onClick));
      return () => {
        window.removeEventListener("resize", onResize);
        elements.current.forEach((el) => el?.removeEventListener("click", onClick));
      };
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
    let press: { x: number; y: number; t: number; link?: string } | null = null;
    const onDown = (e: PointerEvent) => {
      const index = elements.current.indexOf(e.currentTarget as HTMLDivElement);
      const body = world.bodies[index];
      if (!body) return;
      press = { x: e.clientX, y: e.clientY, t: performance.now(), link: balloons[index]?.link };
      e.preventDefault();
      const p = toWorld(e);
      world.movePointer(p.x, p.y, 0, true);
      world.pointer.vx = 0;
      world.pointer.vy = 0;
      world.grab(body);
      body.el.setPointerCapture(e.pointerId);
      root.classList.add("is-grabbing");
    };
    const onUp = (e: PointerEvent) => {
      const p = press;
      press = null;
      if (
        e.type === "pointerup" &&
        p?.link &&
        Math.hypot(e.clientX - p.x, e.clientY - p.y) < CLICK_SLOP &&
        performance.now() - p.t < CLICK_TIME
      ) {
        window.open(p.link, "_blank", "noopener,noreferrer");
      }
      if (!world.grabbed) return;
      world.release();
      root.classList.remove("is-grabbing");
    };

    const onOrbit = (e: Event) => {
      const on = (e as CustomEvent<boolean>).detail;
      if (on && !world.orbiting) world.startOrbit();
      else if (!on) world.stopOrbit();
    };
    window.addEventListener(ORBIT_EVENT, onOrbit);

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
          // They all leave together and float straight up from where they are.
          const spots = world.settleStraightUp();
          for (const b of world.bodies) {
            const spot = spots.get(b)!;
            world.launch(b, spot.x, spot.y, INTRO.balloonFloat / 1000);
          }
          start();
        }, INTRO.lift);
      });
    }

    return () => {
      cancelled = true;
      clearTimeout(releaseTimer);
      pops.forEach((animation) => animation.cancel());
      stop();
      visibility.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener(ORBIT_EVENT, onOrbit);
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
          onPointerEnter={onHoverSfx}
          onPointerLeave={onHoverOffSfx}
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
