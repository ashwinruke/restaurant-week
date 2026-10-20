import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AGENT_IDS } from "../bandits";
import { DINNERS, FRIENDS, NEIGHBOURHOOD, PLAYER_META, type PlayerId } from "../game/data";
import { playerExploring, playerRegret, useGame } from "../store/game";
import { Avatar, Button, Monogram, PIXEL_FONT, Stars, useThemeColors } from "../components/ui";

interface Row {
  id: PlayerId;
  choices: number[];
  ratings: number[];
  regret: number[];
  explored: boolean[];
}

const RANKS = ["1st", "2nd", "3rd", "4th"];
const tone = (id: PlayerId) => `rgb(var(--${PLAYER_META[id].color}))`;

export function Reveal() {
  const { restaurants, kitchens, meals, friends, seed, replay, newWeek, go } = useGame();
  const colors = useThemeColors();
  const [active, setActive] = useState(DINNERS);
  const [hidden, setHidden] = useState<Set<PlayerId>>(new Set());

  const rows: Row[] = useMemo(
    () => [
      { id: "you", choices: meals.map((m) => m.arm), ratings: meals.map((m) => m.rating), regret: playerRegret(meals, kitchens), explored: playerExploring(meals) },
      ...AGENT_IDS.map((id) => ({ id, choices: friends[id].choices, ratings: friends[id].ratings, regret: friends[id].cumRegret, explored: friends[id].decisions.map((d) => d.explored) })),
    ],
    [meals, friends, kitchens],
  );

  // "Replay" and "New week" reset the diary while this screen is still fading out; render nothing for that moment.
  if (meals.length < DINNERS) return null;

  const bestArm = restaurants.findIndex((_, a) => kitchens.isBest(a));
  const ranked = [...rows].sort((a, b) => a.regret[DINNERS - 1] - b.regret[DINNERS - 1]);
  const you = rows[0];
  const youRank = ranked.findIndex((r) => r.id === "you") + 1;
  const qs = restaurants.map((r) => r.quality);
  const qMin = Math.min(...qs);
  const qMax = Math.max(...qs);
  const shade = (arm: number) => Math.round(10 + ((qs[arm] - qMin) / (qMax - qMin)) * 80);

  const chartData = Array.from({ length: DINNERS }, (_, i) => {
    const o: Record<string, number> = { t: i + 1 };
    rows.forEach((r) => (o[r.id] = +r.regret[i].toFixed(2)));
    return o;
  });

  const headline = youRank === 1 ? "New high score! You missed the fewest stars." : `${PLAYER_META[ranked[0].id].name} wins this round. You placed ${RANKS[youRank - 1]}.`;

  const toggle = (id: PlayerId) =>
    setHidden((h) => {
      const n = new Set(h);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const tick = { fill: colors.muted, fontSize: 9, fontFamily: PIXEL_FONT };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 py-8">
      <header className="grid gap-4">
        <p className="eyebrow">Stage clear · week #{seed}</p>
        <h1 className="max-w-4xl font-display text-lg leading-[1.5] md:text-3xl md:leading-[1.4]" style={{ textShadow: "3px 3px 0 rgb(var(--star))" }}>
          {headline}
        </h1>
        <p className="max-w-3xl text-lg text-muted">
          The best kitchen in {NEIGHBOURHOOD} was <strong className="text-ink">{restaurants[bestArm].name}</strong> (true average{" "}
          <span className="num font-mono text-xs text-gold">{restaurants[bestArm].quality.toFixed(2)}</span> stars). <strong className="text-ink">Stars missed</strong> is regret: for every
          dinner, how much worse the chosen place is on average than the best one. Unlike stars collected, it ignores lucky and unlucky nights and only judges the choices.
        </p>
      </header>

      <section className="px-panel grid gap-4 p-4 md:p-6">
        <h2 className="text-center font-display text-sm text-gold md:text-base">High scores</h2>
        <p className="text-center text-sm text-muted">Fewest stars missed wins</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-y-1">
            <thead>
              <tr className="font-mono text-[9px] uppercase text-muted">
                <th className="px-3 py-2 text-left font-normal">Rank</th>
                <th className="px-3 py-2 text-left font-normal">Player</th>
                <th className="px-3 py-2 text-right font-normal">Stars missed</th>
                <th className="px-3 py-2 text-right font-normal">Collected</th>
                <th className="px-3 py-2 text-right font-normal">At the best</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => {
                const bestVisits = r.choices.filter((a) => a === bestArm).length;
                return (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 * i, duration: 0.05 }} className={r.id === "you" ? "bg-you/15" : ""}>
                    <td className="num px-3 py-3 font-mono text-xs" style={{ color: i === 0 ? "rgb(var(--star))" : undefined }}>
                      {RANKS[i]}
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar id={r.id} size={24} />
                        <span className="font-mono text-[11px] uppercase" style={{ color: tone(r.id) }}>
                          {PLAYER_META[r.id].name}
                        </span>
                        <span className="text-sm text-muted">{PLAYER_META[r.id].tag}</span>
                        {r.id === "you" && <span className="blink font-mono text-[9px] text-you">◀</span>}
                      </span>
                    </td>
                    <td className="num px-3 py-3 text-right font-mono text-sm">{r.regret[DINNERS - 1].toFixed(1)}</td>
                    <td className="num px-3 py-3 text-right font-mono text-xs text-gold">{r.ratings.reduce((s, x) => s + x, 0).toFixed(1)}</td>
                    <td className="num px-3 py-3 text-right font-mono text-xs">
                      {bestVisits}/{DINNERS}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="px-panel grid gap-5 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <h2 className="font-display text-sm uppercase md:text-base">Regret curves</h2>
            <p className="text-muted">Stars missed, added up dinner by dinner. Flat steps mean eating at the best place. Hover to scrub through the week.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggle(r.id)}
                aria-pressed={!hidden.has(r.id)}
                className={`px-tag ${hidden.has(r.id) ? "opacity-40" : ""}`}
                style={{ color: tone(r.id) }}
              >
                <span className="h-2 w-2" style={{ background: tone(r.id) }} />
                {PLAYER_META[r.id].name}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72 w-full border-4 border-line bg-sunk p-2">
          <ResponsiveContainer>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 12, bottom: 4, left: -8 }}
              onMouseMove={(s) => s?.activeLabel != null && setActive(Number(s.activeLabel))}
            >
              <CartesianGrid stroke={colors.line} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="t" tick={tick} stroke={colors.line} tickLine={false} />
              <YAxis tick={tick} stroke={colors.line} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: colors.surface, border: `4px solid ${colors.edge}`, borderRadius: 0, fontSize: 14 }}
                labelStyle={{ color: colors.gold, fontFamily: PIXEL_FONT, fontSize: 9, marginBottom: 6 }}
                labelFormatter={(t) => `Dinner ${t}`}
                formatter={(v: number, k: string) => [`${v.toFixed(2)} missed`, PLAYER_META[k as PlayerId].name]}
              />
              <ReferenceLine x={active} stroke={colors.star} strokeDasharray="4 4" />
              {rows.map((r) =>
                hidden.has(r.id) ? null : (
                  <Line key={r.id} type="stepAfter" dataKey={r.id} stroke={colors[r.id]} strokeWidth={r.id === "you" ? 4 : 3} dot={false} isAnimationActive={false} />
                ),
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="eyebrow text-ink">Everyone's week, dinner by dinner</h3>
            <p className="text-sm text-muted">Brighter = better kitchen · gold frame = the best place · dot = tried something other than their favourite</p>
          </div>
          <div className="overflow-x-auto pb-1">
            <table className="border-separate border-spacing-1">
              <thead>
                <tr>
                  <th />
                  {Array.from({ length: DINNERS }, (_, i) => (
                    <th key={i} className={`num w-8 font-mono text-[8px] font-normal ${active === i + 1 ? "text-gold" : "text-muted"}`}>
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="pr-2">
                      <span className="flex items-center gap-2">
                        <Avatar id={r.id} size={16} />
                        <span className="w-12 font-mono text-[9px] uppercase" style={{ color: tone(r.id) }}>
                          {PLAYER_META[r.id].name}
                        </span>
                      </span>
                    </td>
                    {r.choices.map((a, i) => (
                      <td key={i} className="p-0">
                        <button
                          type="button"
                          onMouseEnter={() => setActive(i + 1)}
                          onFocus={() => setActive(i + 1)}
                          onClick={() => setActive(i + 1)}
                          title={`${restaurants[a].name}: ${r.ratings[i]} stars`}
                          className={`relative grid h-8 w-8 place-items-center font-mono text-[9px] ${active === i + 1 ? "outline outline-2 outline-offset-1 outline-ink" : ""} ${
                            a === bestArm ? "border-[3px] border-star" : "border-[3px] border-black"
                          }`}
                          style={{ background: `color-mix(in srgb, rgb(var(--good)) ${shade(a)}%, rgb(var(--sunk)))`, color: shade(a) > 50 ? "#fff" : "rgb(var(--ink))" }}
                        >
                          {restaurants[a].name[0]}
                          {r.explored[i] && <span className="absolute bottom-0.5 h-1 w-1 bg-current" />}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-3 border-4 border-line bg-sunk p-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => {
            const a = r.choices[active - 1];
            return (
              <div key={r.id} className="flex items-center gap-3">
                <Avatar id={r.id} size={24} />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    Dinner {active}: {restaurants[a].name}
                  </p>
                  <p className="num font-mono text-[9px] text-muted">
                    got {r.ratings[active - 1].toFixed(1)} · missed {kitchens.gap(a).toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-sm uppercase md:text-base">The kitchens, unmasked</h2>
        <div className="grid gap-3">
          {restaurants
            .map((r, arm) => ({ r, arm }))
            .sort((x, y) => y.r.quality - x.r.quality)
            .map(({ r, arm }, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 * i, duration: 0.05 }}
                className={`px-panel grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 p-3 md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto] ${
                  arm === bestArm ? "border-star" : ""
                }`}
              >
                <Monogram name={r.name} hue={r.hue} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="truncate text-lg">{r.name}</span>
                    {arm === bestArm && <span className="px-tag bg-star text-black">Best in town</span>}
                  </p>
                  <p className="truncate text-muted">{r.dish}</p>
                </div>
                <div className="col-span-2 flex items-center gap-3 md:col-span-1">
                  <Stars value={r.quality} size={16} />
                  <span className="num font-mono text-[11px] text-gold">{r.quality.toFixed(2)}</span>
                </div>
                <div className="col-span-2 flex gap-4 md:col-span-1">
                  {rows.map((row) => (
                    <span key={row.id} className="num flex items-center gap-1.5 font-mono text-[10px]" title={`${PLAYER_META[row.id].name}: visits`}>
                      <Avatar id={row.id} size={16} />
                      {row.choices.filter((c) => c === arm).length}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-sm uppercase md:text-base">Rivals unmasked</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {FRIENDS.map((f) => (
            <div key={f.id} className="px-panel grid content-start gap-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar id={f.id} size={32} />
                <div className="grid gap-1.5">
                  <p className="font-display text-xs uppercase" style={{ color: tone(f.id) }}>
                    {f.name}
                  </p>
                  <p className="text-base font-semibold text-gold">= {f.algorithm}</p>
                </div>
              </div>
              <p className="text-lg leading-snug">{f.explain}</p>
              <code className="border-4 border-line bg-sunk px-3 py-2 font-sans text-base leading-snug text-gold">{f.rule}</code>
            </div>
          ))}
        </div>
        <p className="max-w-3xl text-lg text-muted">
          You explored on <strong className="text-ink">{you.explored.filter(Boolean).length}</strong> of {DINNERS} dinners (a dot in the timeline). One week is a small, noisy sample. To see which strategy is really better, they need to play thousands of weeks.
        </p>
      </section>

      <div className="grid gap-4 border-t-4 border-line pt-6">
        <div className="flex flex-wrap gap-4">
          <Button variant="gold" onClick={() => go("lab")}>
            See the math ▶
          </Button>
          <Button variant="ghost" onClick={replay}>
            Replay this week
          </Button>
          <Button variant="ghost" onClick={() => newWeek()}>
            New week
          </Button>
        </div>
        <p className="text-muted">Replaying keeps the same restaurants and the same luck, so you can test a different strategy against your rivals.</p>
      </div>
    </div>
  );
}
