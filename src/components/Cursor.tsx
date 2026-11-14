import { useEffect, useRef } from "react";

type CursorState = "arrow" | "point" | "open" | "grab";

// `width` is the size shown, and `x`/`y` the hotspot inside each image, in px.
// Keep the hotspots the same as the ones in styles.css.
const CURSORS: { state: CursorState; width: number; x: number; y: number }[] = [
  { state: "arrow", width: 39, x: 4, y: 4 },
  { state: "point", width: 40, x: 16, y: 3 },
  { state: "open", width: 39, x: 20, y: 24 },
  { state: "grab", width: 37, x: 19, y: 22 },
];

function stateFor(target: EventTarget | null): CursorState {
  if (document.documentElement.classList.contains("is-grabbing")) return "grab";
  if (!(target instanceof Element)) return "arrow";
  if (target.closest('[aria-disabled="true"]')) return "arrow";
  if (target.closest(".balloon")) return "open";
  if (target.closest("a, button")) return "point";
  return "arrow";
}

// Native CSS cursors can't animate, so on mouse devices one element follows the
// pointer and springs between images. Touch devices and reduced-motion users
// keep the native cursors from styles.css.
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    let lastTarget: EventTarget | null = null;

    const update = (target: EventTarget | null) => {
      lastTarget = target;
      const next = stateFor(target);
      if (el.dataset.state !== next) el.dataset.state = next;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      update(e.target);
      if (el.dataset.visible !== "true") {
        el.dataset.visible = "true";
        root.classList.add("custom-cursor");
      }
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "mouse") update(e.target);
    };
    const onLeave = () => {
      el.dataset.visible = "false";
    };

    const grabbing = new MutationObserver(() => update(lastTarget));
    grabbing.observe(root, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    root.addEventListener("mouseleave", onLeave);

    return () => {
      grabbing.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      root.removeEventListener("mouseleave", onLeave);
      root.classList.remove("custom-cursor");
    };
  }, []);

  return (
    <div ref={ref} className="cursor" data-state="arrow" data-visible="false" aria-hidden="true">
      {CURSORS.map(({ state, width, x, y }) => (
        <img
          key={state}
          className={`cursor-img cursor-${state}`}
          src={`/assets/cursors/${state}@2x.png`}
          width={width}
          alt=""
          style={{ left: -x, top: -y, transformOrigin: `${x}px ${y}px` }}
        />
      ))}
    </div>
  );
}
