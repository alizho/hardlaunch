import type { MouseEvent } from "react";
import arrow from "../assets/downward.svg";
import { onHoverSfx } from "../lib/sfx";
import { settle, track } from "./Socials";

// A small arrow at the bottom of the hero that dips every few seconds to show
// there's more below. Clicking it scrolls to the directory. It shares the
// social buttons' hover parallax: it drifts toward the cursor and tilts to face it.
export function ScrollArrow() {
  const scroll = (e: MouseEvent) => {
    e.preventDefault();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("launches")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <a
      className="scroll-arrow"
      href="#launches"
      aria-label="Scroll to the directory"
      onClick={scroll}
      onPointerEnter={onHoverSfx}
      onPointerMove={track}
      onPointerLeave={settle}
    >
      <img src={arrow} alt="" draggable={false} />
    </a>
  );
}
