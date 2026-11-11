import { useRef, useState, type MouseEvent, type RefObject } from "react";
import { useFollow } from "../lib/useFollow";
import { onHoverOffSfx, onHoverSfx } from "../lib/sfx";

// Clicking the logo toggles the balloons between floating and circling it.
// BalloonField listens for this; `detail` is true to start circling.
export const ORBIT_EVENT = "balloons:orbit";

export function Logo({ logoRef }: { logoRef: RefObject<HTMLHeadingElement | null> }) {
  const { hitRef, targetRef } = useFollow<HTMLAnchorElement, HTMLImageElement>(0.5);
  const [orbiting, setOrbiting] = useState(false);
  // Read from a ref so quick repeat clicks never act on a stale state.
  const orbitingRef = useRef(false);

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    const next = !orbitingRef.current;
    orbitingRef.current = next;
    setOrbiting(next);
    window.dispatchEvent(new CustomEvent(ORBIT_EVENT, { detail: next }));
  };

  return (
    <h1 className="site-logo" ref={logoRef}>
      <a href="/" aria-label="Hard Launch" role="button" aria-pressed={orbiting} ref={hitRef} onClick={toggle} onPointerEnter={onHoverSfx} onPointerLeave={onHoverOffSfx}>
        <img src="/assets/hero/logo.svg" alt="" draggable={false} ref={targetRef} />
      </a>
    </h1>
  );
}
