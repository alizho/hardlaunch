import { useEffect, useRef } from "react";
import { Cursor } from "./components/Cursor";
import { Hero } from "./components/Hero";
import { Logo } from "./components/Logo";
import { isIntroPending, playIntro } from "./lib/intro";

export function App() {
  const logoRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isIntroPending()) return playIntro();
  }, []);

  return (
    <>
      <Logo logoRef={logoRef} />
      <main>
        <Hero logoRef={logoRef} />
      </main>
      <Cursor />
    </>
  );
}
