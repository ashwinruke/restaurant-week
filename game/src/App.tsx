import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { useGame } from "./store/game";
import { Intro } from "./screens/Intro";
import { Play } from "./screens/Play";
import { Reveal } from "./screens/Reveal";
import { Lab } from "./screens/Lab";
import { Coin } from "./components/ui";

// The notebook page carries the notebook's plots and the math renderer, so it loads only when opened.
const Notebook = lazy(() => import("./screens/Notebook"));

const SCREENS = { intro: Intro, play: Play, reveal: Reveal, lab: Lab, notebook: Notebook };

export default function App() {
  const { screen, go, newWeek } = useGame();
  const Screen = SCREENS[screen];

  useEffect(() => {
    // Block body on purpose: newer browsers return a Promise from scrollTo, and an effect must return nothing or a cleanup function.
    window.scrollTo({ top: 0 });
  }, [screen]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="page min-h-full pb-16">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-b-4 border-line py-4">
          <button type="button" onClick={() => go("intro")} className="flex items-center gap-3 font-display text-[11px] uppercase tracking-wide md:text-xs">
            <Coin />
            Restaurant Week
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => newWeek()} className="px-tag text-muted hover:text-ink">
              New week
            </button>
            <button type="button" onClick={() => go("lab")} className={`px-tag ${screen === "lab" ? "bg-star text-black" : "text-muted hover:text-ink"}`}>
              The math
            </button>
            <button type="button" onClick={() => go("notebook")} className={`px-tag ${screen === "notebook" ? "bg-star text-black" : "text-muted hover:text-ink"}`}>
              Notebook
            </button>
          </div>
        </nav>
        <AnimatePresence mode="wait">
          <motion.main
            key={screen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: (t: number) => Math.floor(t * 4) / 4 }}
          >
            <Suspense fallback={<p className="eyebrow mx-auto max-w-6xl py-10">Loading…</p>}>
              <Screen />
            </Suspense>
          </motion.main>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
