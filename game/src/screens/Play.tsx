import { AnimatePresence, motion } from "framer-motion";
import { DINNERS } from "../game/data";
import { useGame } from "../store/game";
import { Button, CoinCounter, Hearts, Monogram, Stars } from "../components/ui";

const verdict = (r: number) =>
  r >= 4.5 ? "Outstanding!" : r >= 3.5 ? "Really good." : r >= 2.5 ? "Fine, nothing special." : r >= 1.5 ? "Disappointing..." : "Awful night!";

export function Play() {
  const { restaurants, meals, eat, go } = useGame();
  const day = meals.length;
  const done = day >= DINNERS;
  const last = meals[day - 1];
  const total = meals.reduce((s, m) => s + m.rating, 0);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 py-8">
      <header className="px-panel grid gap-4 p-4 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8">
        <div className="grid gap-2">
          <p className="eyebrow">{done ? "Week complete" : `Dinner ${String(day + 1).padStart(2, "0")} / ${DINNERS}`}</p>
          <h1 className="font-display text-sm leading-relaxed md:text-lg">{done ? "That's the week!" : "Where are you eating tonight?"}</h1>
        </div>
        <div className="grid gap-1.5">
          <span className="eyebrow">Dinners left</span>
          <Hearts total={DINNERS} left={DINNERS - day} />
        </div>
        <div className="grid gap-1.5">
          <span className="eyebrow">Stars</span>
          <CoinCounter value={total.toFixed(1)} label="stars collected" />
        </div>
      </header>

      <div className="min-h-[92px]" aria-live="polite">
        <AnimatePresence mode="wait">
          {last ? (
            <motion.div
              key={day}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="px-panel relative flex flex-wrap items-center gap-x-5 gap-y-3 bg-sunk px-4 py-4"
            >
              <Monogram name={restaurants[last.arm].name} hue={restaurants[last.arm].hue} size={48} />
              <div className="min-w-[200px] flex-1">
                <p className="text-muted">
                  Dinner {last.day} · {restaurants[last.arm].name} · {restaurants[last.arm].dish}
                </p>
                <p className="font-display text-xs leading-relaxed md:text-sm">{verdict(last.rating)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Stars value={last.rating} size={24} pop />
                <span className="num font-mono text-sm text-gold">{last.rating.toFixed(1)}</span>
              </div>
              <span className="blink absolute bottom-1.5 right-3 font-display text-[10px] text-muted" aria-hidden="true">
                ▼
              </span>
            </motion.div>
          ) : (
            <p className="px-inset px-4 py-6 text-lg text-muted">
              Pick a restaurant. A single meal is a noisy signal: great kitchens have off nights, and average ones get lucky.
            </p>
          )}
        </AnimatePresence>
      </div>

      {done && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-panel flex flex-wrap items-center justify-between gap-4 border-star p-5">
          <div className="grid gap-2">
            <p className="font-display text-sm text-gold">Week complete!</p>
            <p className="max-w-xl text-lg">
              {DINNERS} dinners, {total.toFixed(1)} stars. Your rivals finished too. Time to find out which kitchen was really best, and who wasted the fewest evenings.
            </p>
          </div>
          <Button variant="gold" onClick={() => go("reveal")}>
            Compare notes ▶
          </Button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {restaurants.map((r, arm) => {
          const mine = meals.filter((m) => m.arm === arm);
          const avg = mine.length ? mine.reduce((s, m) => s + m.rating, 0) / mine.length : null;
          const justAte = last?.arm === arm;
          return (
            <button
              key={r.name}
              type="button"
              disabled={done}
              onClick={() => eat(arm)}
              className={`px-panel grid content-start gap-3 p-4 text-left transition-transform disabled:cursor-default ${
                justAte ? "border-star" : ""
              } ${done ? "" : "hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none"}`}
            >
              <div className="flex items-start gap-3">
                <Monogram name={r.name} hue={r.hue} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight">{r.name}</p>
                  <p className="text-muted">{r.cuisine}</p>
                </div>
              </div>
              {avg == null ? (
                <span className="px-tag w-fit text-gold">New!</span>
              ) : (
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Stars value={avg} size={16} />
                    <span className="num font-mono text-[11px]">{avg.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted">
                    {mine.length} {mine.length === 1 ? "visit" : "visits"} · your average
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mine.map((m) => (
                      <span key={m.day} className="num bg-sunk px-1.5 py-1 font-mono text-[9px]" title={`Dinner ${m.day}`}>
                        {m.rating.toFixed(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <section className="grid gap-3">
        <h2 className="eyebrow">Food diary</h2>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: DINNERS }, (_, i) => {
            const m = meals[i];
            return m ? (
              <div key={i} className="grid w-12 justify-items-center gap-1.5 border-4 border-line bg-surface py-2" title={`Dinner ${i + 1}: ${restaurants[m.arm].name}, ${m.rating}★`}>
                <Monogram name={restaurants[m.arm].name} hue={restaurants[m.arm].hue} size={26} />
                <span className="num font-mono text-[9px] text-gold">{m.rating.toFixed(1)}</span>
              </div>
            ) : (
              <div key={i} className="num grid h-[70px] w-12 place-items-center border-4 border-dashed border-line font-mono text-[9px] text-muted">
                {String(i + 1).padStart(2, "0")}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
