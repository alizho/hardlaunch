import { useEffect, useState, type CSSProperties } from "react";
import soundOnIcon from "../assets/sfx/soundon.svg";
import soundOffIcon from "../assets/sfx/soundoff.svg";
import { onHoverSfx, setSoundOn } from "../lib/sfx";
import { settle, track } from "./Socials";

// Top-right switch for the site's sound. Sound starts on. It shares the social
// buttons' size, hover parallax, and hover sounds; the two icons swap with a
// small spring.
export function SoundToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setSoundOn(on);
  }, [on]);

  return (
    <button
      type="button"
      className="social sound-toggle"
      aria-label="Sound"
      aria-pressed={on}
      style={{ "--w": 36, "--h": 37 } as CSSProperties}
      onClick={() => setOn((v) => !v)}
      onPointerEnter={onHoverSfx}
      onPointerMove={track}
      onPointerLeave={settle}
    >
      <img className={`sound-icon${on ? " is-active" : ""}`} src={soundOnIcon} alt="" draggable={false} />
      <img className={`sound-icon${on ? "" : " is-active"}`} src={soundOffIcon} alt="" draggable={false} />
    </button>
  );
}
