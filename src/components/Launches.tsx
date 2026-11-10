import { useEffect, useRef, useState } from "react";
import { tileWidths } from "../data/content";
import { launches, type Launch } from "../lib/companies";

const EASE_RATE = 11; // higher settles faster

function Row({ launch, open, onToggle }: { launch: Launch; open: boolean; onToggle: (id: string) => void }) {
  return (
    <li className="launch-row" data-open={open}>
      <button
        type="button"
        className="launch-head"
        style={{ minHeight: `calc(${launch.h / 10}rem + 3.5248rem)` }}
        aria-expanded={open}
        onClick={() => onToggle(launch.id)}
      >
        <span className="launch-logo" style={{ width: `${launch.w / 10}rem`, height: `${launch.h / 10}rem` }}>
          <img
            src={launch.logo}
            alt=""
            draggable={false}
            style={{ inset: 0, width: "100%", height: "100%" }}
          />
        </span>
        <span className="launch-name" style={{ color: launch.color }}>{launch.name}</span>
        <span className="launch-year">{launch.year}</span>
      </button>
      <div className="launch-strip">
        <div className="launch-strip-clip">
          <div className="launch-tiles">
            {tileWidths.map((width, i) => {
              const tile = launch.tiles?.[i];
              return (
                <div key={i} className="launch-tile" style={{ width: `${width / 10}rem` }}>
                  {tile?.src && <img src={tile.src} alt={tile.alt ?? ""} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </li>
  );
}

export function Launches() {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const list = useRef<HTMLUListElement>(null);
  const heights = useRef<number[]>(launches.map(() => 0)); // 0 closed, 1 open

  const toggle = (id: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  useEffect(() => {
    const strips = [...(list.current?.querySelectorAll<HTMLElement>(".launch-strip") ?? [])];
    const targets = launches.map((launch) => (openIds.has(launch.id) ? 1 : 0));
    const current = heights.current;
    const write = () => strips.forEach((strip, i) => strip.style.setProperty("--open", current[i].toFixed(5)));

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((target, i) => (current[i] = target));
      write();
      return;
    }

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const blend = 1 - Math.exp(((now - last) / 1000) * -EASE_RATE);
      last = now;
      let settled = true;
      current.forEach((height, i) => {
        current[i] = height + (targets[i] - height) * blend;
        if (Math.abs(targets[i] - current[i]) > 0.0005) settled = false;
      });
      if (settled) targets.forEach((target, i) => (current[i] = target));
      write();
      if (!settled) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [openIds]);

  return (
    <section id="launches" className="launches">
      <div className="launches-table">
        <div className="launches-header">
          <div className="launches-header-left">
            <span className="header-tag">Logo</span>
            <span className="header-tag">Company</span>
          </div>
          <span className="header-tag">Year launched</span>
        </div>
        <ul className="launch-list" ref={list}>
          {launches.map((launch) => (
            <Row key={launch.id} launch={launch} open={openIds.has(launch.id)} onToggle={toggle} />
          ))}
        </ul>
      </div>
    </section>
  );
}
