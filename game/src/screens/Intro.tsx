import { motion } from "framer-motion";
import { DINNERS, FRIENDS, N_PLACES, NEIGHBOURHOOD, PLAYER_META } from "../game/data";
import { useGame } from "../store/game";
import { Avatar, Button, Coin, Hearts, Monogram } from "../components/ui";

export function Intro() {
  const { restaurants, go } = useGame();
  return (
    <div className="mx-auto grid max-w-5xl gap-12 py-10 md:py-14">
      <section className="px-panel grid gap-6 p-6 md:p-10">
        <p className="eyebrow">Stage 1 · {NEIGHBOURHOOD}</p>
        <h1 className="font-display text-2xl leading-[1.35] text-star md:text-5xl md:leading-[1.25]" style={{ textShadow: "4px 4px 0 #000" }}>
          Restaurant
          <br />
          Week
        </h1>
        <p className="max-w-2xl text-xl md:text-2xl">
          You just moved to {NEIGHBOURHOOD}. You have {DINNERS} dinners to find the best food in town.
        </p>
        <p className="max-w-2xl text-muted">
          There are {N_PLACES} restaurants. Each kitchen has a true quality you can't see, and any single meal can be a lucky or unlucky night. Keep going back to a place you like, or
          risk an evening on somewhere new? Every dinner at a worse place costs you stars.
        </p>
        <div className="grid gap-4 border-y-4 border-line py-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <span className="eyebrow">Dinners</span>
          <Hearts total={DINNERS} left={DINNERS} />
          <span className="eyebrow">Goal</span>
          <span className="flex items-center gap-3 text-lg">
            <Coin /> Collect stars, waste as few evenings as you can
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={() => go("play")}>▶ Start week</Button>
          <Button variant="ghost" onClick={() => go("lab")}>
            Skip to the math
          </Button>
          <span className="blink font-display text-[10px] text-gold">Press start</span>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-sm uppercase">Tonight's options</h2>
        <div className="flex flex-wrap gap-3">
          {restaurants.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.06 * i, duration: 0.1 }}
              className="px-inset flex items-center gap-3 py-1.5 pl-1.5 pr-3"
            >
              <Monogram name={r.name} hue={r.hue} size={32} />
              <span className="text-base font-medium">{r.name}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="grid gap-2">
          <h2 className="font-display text-sm uppercase">Your rivals this week</h2>
          <p className="max-w-2xl text-muted">
            Three friends moved in too, and each decides where to eat in their own way. You won't see their choices until the week is over. Then you compare notes.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {FRIENDS.map((f) => (
            <div key={f.id} className="px-panel relative grid content-start gap-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar id={f.id} size={32} />
                <span className="font-display text-sm uppercase" style={{ color: `rgb(var(--${PLAYER_META[f.id].color}))` }}>
                  {f.name}
                </span>
              </div>
              <p className="text-lg leading-snug">“{f.motto}”</p>
              <span className="blink absolute bottom-2 right-3 font-display text-[10px] text-muted" aria-hidden="true">
                ▼
              </span>
            </div>
          ))}
        </div>
        <p className="text-muted">Their strategies are three classic reinforcement-learning algorithms. Their real names are revealed at the end.</p>
      </section>
    </div>
  );
}
