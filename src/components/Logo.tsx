import type { RefObject } from "react";
import { useFollow } from "../lib/useFollow";

export function Logo({ logoRef }: { logoRef: RefObject<HTMLHeadingElement | null> }) {
  const { hitRef, targetRef } = useFollow<HTMLAnchorElement, HTMLImageElement>(0.5);

  return (
    <h1 className="site-logo" ref={logoRef}>
      <a href="/" aria-label="Hard Launch" ref={hitRef}>
        <img src="/assets/hero/logo.svg" alt="" draggable={false} ref={targetRef} />
      </a>
    </h1>
  );
}
