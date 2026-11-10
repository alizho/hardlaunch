import { useState, type FocusEvent, type PointerEvent } from "react";

export type Section = "hero" | "launches";

type Item = { icon: string; label: string; ariaLabel: string; href?: string; section?: Section };

const ITEMS: Item[] = [
  { icon: "home", label: "Home", ariaLabel: "Home", href: "#top", section: "hero" },
  { icon: "launches", label: "Launches", ariaLabel: "Launches", href: "#launches", section: "launches" },
  { icon: "news", label: "News", ariaLabel: "News, coming soon" },
  { icon: "about", label: "About", ariaLabel: "About, coming soon" },
];

export function Sidebar({ active }: { active: Section }) {
  // One pill for the whole menu, so it can slide from item to item.
  const [pill, setPill] = useState({ index: 0, width: 0, visible: false, moving: false });

  const show = (index: number, item: HTMLElement) => {
    const width = item.querySelector<HTMLElement>(".nav-label")?.offsetWidth ?? 0;
    setPill((current) => ({ index, width, visible: true, moving: current.visible }));
  };
  const hide = () => setPill((current) => ({ ...current, visible: false, moving: false }));

  return (
    <nav
      className="sidebar"
      aria-label="Main"
      data-hovering={pill.visible}
      onPointerLeave={hide}
    >
      <span
        className="nav-pill"
        aria-hidden="true"
        data-visible={pill.visible}
        data-moving={pill.moving}
        style={{
          width: `calc(8.4rem + ${pill.width}px)`,
          transform: `translateY(calc(${pill.index} * var(--nav-row)))`,
        }}
      />
      {ITEMS.map((item, index) => {
        const shared = {
          className: "nav-item",
          "aria-label": item.ariaLabel,
          "data-hovered": pill.visible && pill.index === index,
          onPointerEnter: (e: PointerEvent<HTMLElement>) => {
            if (e.pointerType === "mouse") show(index, e.currentTarget);
          },
          onFocus: (e: FocusEvent<HTMLElement>) => {
            if (e.currentTarget.matches(":focus-visible")) show(index, e.currentTarget);
          },
          onBlur: hide,
        };
        const content = (
          <>
            <span className="nav-icons" aria-hidden="true">
              <img className={`nav-icon nav-icon-${item.icon}`} src={`/assets/hero/nav-${item.icon}.svg`} alt="" />
            </span>
            <span className="nav-label" aria-hidden="true">{item.label}</span>
          </>
        );
        return item.href ? (
          <a key={item.icon} {...shared} href={item.href} aria-current={active === item.section ? "true" : undefined}>
            {content}
          </a>
        ) : (
          <span key={item.icon} {...shared} role="link" aria-disabled="true">
            {content}
          </span>
        );
      })}
    </nav>
  );
}
