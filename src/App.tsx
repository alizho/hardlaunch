import { useEffect, useRef, useState } from "react";
import { Cursor } from "./components/Cursor";
import { Hero } from "./components/Hero";
import { Launches } from "./components/Launches";
import { Sidebar, type Section } from "./components/Sidebar";
import { StickyLogo } from "./components/StickyLogo";
import { isIntroPending, playIntro } from "./lib/intro";

export function App() {
  const [active, setActive] = useState<Section>("hero");
  const logoRef = useRef<HTMLHeadingElement>(null);
  const [revealed, setRevealed] = useState(() => !isIntroPending());

  useEffect(() => {
    if (isIntroPending()) return playIntro(() => setRevealed(true));
  }, []);

  useEffect(() => {
    const launches = document.getElementById("launches");
    if (!launches) return;
    // The section crossing the middle of the viewport is the current one.
    const update = () =>
      setActive(launches.getBoundingClientRect().top <= window.innerHeight / 2 ? "launches" : "hero");
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      <StickyLogo logoRef={logoRef} />
      <Sidebar active={active} />
      <main>
        <Hero logoRef={logoRef} revealed={revealed} />
        <Launches />
      </main>
      <Cursor />
    </>
  );
}
