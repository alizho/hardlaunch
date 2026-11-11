import type { CSSProperties, PointerEvent } from "react";
import xIcon from "../assets/socials/x.svg";
import linkedinIcon from "../assets/socials/linkedin.svg";
import mailIcon from "../assets/socials/mail.svg";
import { onHoverOffSfx, onHoverSfx } from "../lib/sfx";

const socials = [
  { name: "X", label: "Hard Launch on X", href: "https://x.com/hardlaunching", icon: xIcon, w: 36},
  { name: "LinkedIn", label: "Hard Launch on LinkedIn", href: "https://www.linkedin.com/company/hardlaunching", icon: linkedinIcon, w: 36},
  { name: "Email", label: "Email Jacky@hardlaunchcompany.com", href: "mailto:Jacky@hardlaunchcompany.com", icon: mailIcon, w: 36},
];

// Hover parallax: the button drifts toward the cursor and tilts to face it.
const SHIFT = 5; // most it moves, in px
const TILT = 14; // most it tilts, in degrees

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function track(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse" || reducedMotion()) return;
  const el = e.currentTarget;
  // Measured from the offset parent and offsets, which ignore the button's
  // own movement, so the parallax doesn't feed back into itself.
  const parent = (el.offsetParent ?? document.body).getBoundingClientRect();
  const half = el.offsetWidth / 2;
  const x = (e.clientX - (parent.left + el.offsetLeft + half)) / half;
  const y = (e.clientY - (parent.top + el.offsetTop + half)) / half;
  const nx = Math.max(-1, Math.min(1, x));
  const ny = Math.max(-1, Math.min(1, y));
  el.dataset.tracking = "";
  el.style.setProperty("--tx", `${nx * SHIFT}px`);
  el.style.setProperty("--ty", `${ny * SHIFT}px`);
  el.style.setProperty("--rx", `${-ny * TILT}deg`);
  el.style.setProperty("--ry", `${nx * TILT}deg`);
}

export function settle(e: PointerEvent<HTMLElement>) {
  onHoverOffSfx(e);
  const el = e.currentTarget;
  delete el.dataset.tracking;
  for (const prop of ["--tx", "--ty", "--rx", "--ry"]) el.style.removeProperty(prop);
}

export function Socials() {
  return (
    <nav className="socials" aria-label="Hard Launch on social media">
      {socials.map(({ name, label, href, icon, w }) => {
        const external = href.startsWith("http");
        return (
        <a
          key={name}
          className="social"
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          aria-label={label}
          style={{ "--w": w } as CSSProperties}
          onPointerEnter={onHoverSfx}
          onPointerMove={track}
          onPointerLeave={settle}
        >
          <img src={icon} alt="" draggable={false} />
        </a>
        );
      })}
    </nav>
  );
}
