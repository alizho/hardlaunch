import { useEffect, useRef } from "react";
import { Cursor } from "./components/Cursor";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Launches } from "./components/Launches";
import { Logo } from "./components/Logo";
import { RisoPanel } from "./components/RisoPanel";
import { SoundToggle } from "./components/SoundToggle";
import { isIntroPending, playIntro } from "./lib/intro";
import { RISO_PANEL } from "./lib/riso";

export function App() {
  const logoRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isIntroPending()) return playIntro();
  }, []);

  return (
    <>
      <Logo logoRef={logoRef} />
      <SoundToggle />
      <main>
        <Hero logoRef={logoRef} />
        <Launches />
      </main>
      <Footer />
      {RISO_PANEL && <RisoPanel />}
      <Cursor />
    </>
  );
}
