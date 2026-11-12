import { useEffect, useRef, useState } from "react";
import { launches, type Launch } from "../lib/companies";

// Each row opens the company's launch post in a new tab.
function Row({ launch }: { launch: Launch }) {
  return (
    <li className="launch-row">
      <a
        className="launch-head"
        style={{ minHeight: `calc(${launch.h / 10}rem + 3.5248rem)` }}
        href={launch.link}
        target="_blank"
        rel="noreferrer"
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
      </a>
    </li>
  );
}

export function Launches() {
  const [visible, setVisible] = useState(false);
  const section = useRef<HTMLElement>(null);

  // Fades in the first time it's scrolled into view, then stays.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="launches" className="launches" ref={section} data-visible={visible}>
      <div className="launches-table">
        <div className="launches-header">
          <div className="launches-header-left">
            <span className="header-tag">Logo</span>
            <span className="header-tag">Company</span>
          </div>
          <span className="header-tag">Year launched</span>
        </div>
        <ul className="launch-list">
          {launches.map((launch) => (
            <Row key={launch.id} launch={launch} />
          ))}
        </ul>
      </div>
    </section>
  );
}
