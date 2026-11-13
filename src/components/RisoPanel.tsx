import { useState } from "react";
import { RISO_DEFAULTS, setRiso, useRiso, type RisoSettings } from "../lib/riso";

type SliderKey = Exclude<keyof RisoSettings, "enabled">;

const SLIDERS: { key: SliderKey; label: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: "halftone", label: "Halftone", min: 0, max: 1, step: 0.01 },
  { key: "cell", label: "Dot spacing", min: 3, max: 24, step: 0.5, unit: "px" },
  { key: "angle", label: "Screen angle", min: 0, max: 90, step: 1, unit: "°" },
  { key: "softness", label: "Dot softness", min: 0, max: 1, step: 0.01 },
  { key: "density", label: "Sky ink", min: 0.5, max: 1, step: 0.01 },
  { key: "grain", label: "Sky grain", min: 0, max: 1, step: 0.01 },
  { key: "assetGrain", label: "Logo + icon grain", min: 0, max: 1, step: 0.01 },
  { key: "grainSize", label: "Grain size", min: 0.5, max: 4, step: 0.1, unit: "px" },
];

const OPEN_KEY = "riso-panel";

function savedOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) === "open";
  } catch {
    return false;
  }
}

// A tab on the right edge of the screen that opens the riso controls. Changes
// apply live and are remembered in this browser.
export function RisoPanel() {
  const riso = useRiso();
  const [open, setOpen] = useState(savedOpen);
  const [copied, setCopied] = useState(false);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? "open" : "closed");
    } catch {
      // Not remembered; it still opens and closes.
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(riso, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked: nothing to show.
    }
  };

  return (
    <aside className="riso-panel" aria-label="Riso effect controls">
      <button type="button" className="riso-tab" aria-expanded={open} onClick={toggleOpen}>
        {open ? "Close" : "Riso"}
      </button>
      {open && (
        <div className="riso-controls">
          <label className="riso-row">
            Riso effect
            <input type="checkbox" checked={riso.enabled} onChange={(e) => setRiso({ enabled: e.target.checked })} />
          </label>
          <fieldset disabled={!riso.enabled}>
            {SLIDERS.map(({ key, label, min, max, step, unit }) => (
              <label key={key} className="riso-slider">
                <span className="riso-row">
                  {label}
                  <span>
                    {unit ? riso[key] : Math.round(riso[key] * 100)}
                    {unit ?? "%"}
                  </span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={riso[key]}
                  onChange={(e) => setRiso({ [key]: Number(e.target.value) })}
                />
              </label>
            ))}
          </fieldset>
          <div className="riso-row">
            <button type="button" onClick={() => setRiso({ ...RISO_DEFAULTS, enabled: riso.enabled })}>
              Reset
            </button>
            <button type="button" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
