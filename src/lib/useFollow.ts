import { useEffect, useRef } from "react";

const RATE = 9; // higher catches up with the cursor faster

// Eases `target` toward the cursor while it's over `hit`. The pointer is measured
// on `hit`, which must not move, so the shift can't feed back into itself.
// `maxRem` is a hard limit per axis. Uses the CSS `translate` property so it
// never conflicts with a `transform` on the same element.
export function useFollow<Hit extends HTMLElement, Target extends HTMLElement>(maxRem: number) {
  const hitRef = useRef<Hit>(null);
  const targetRef = useRef<Target>(null);

  useEffect(() => {
    const hit = hitRef.current;
    const target = targetRef.current;
    if (!hit || !target) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const goal = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;

    const tick = (now: number) => {
      const blend = 1 - Math.exp(((now - last) / 1000) * -RATE);
      last = now;
      current.x += (goal.x - current.x) * blend;
      current.y += (goal.y - current.y) * blend;
      const settled = Math.hypot(goal.x - current.x, goal.y - current.y) < 0.05;
      if (settled) {
        current.x = goal.x;
        current.y = goal.y;
      }
      target.style.translate = current.x || current.y ? `${current.x.toFixed(2)}px ${current.y.toFixed(2)}px` : "";
      raf = settled ? 0 : requestAnimationFrame(tick);
    };
    const run = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const unit = (v: number) => Math.max(-1, Math.min(1, v));
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = hit.getBoundingClientRect();
      const limit = maxRem * parseFloat(getComputedStyle(document.documentElement).fontSize);
      goal.x = unit((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * limit;
      goal.y = unit((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * limit;
      run();
    };
    const onLeave = () => {
      goal.x = 0;
      goal.y = 0;
      run();
    };

    hit.addEventListener("pointermove", onMove, { passive: true });
    hit.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      hit.removeEventListener("pointermove", onMove);
      hit.removeEventListener("pointerleave", onLeave);
    };
  }, [maxRem]);

  return { hitRef, targetRef };
}
