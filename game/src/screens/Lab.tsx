import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AGENT_IDS, makeAccumulator, simulateRun, summarise, type AgentId, type Summary } from "../bandits";
import { DINNERS, FRIENDS, N_PLACES, PLAYER_META } from "../game/data";
import { playerRegret, useGame } from "../store/game";
import { Avatar, Button, ChunkyBar, PIXEL_FONT, useThemeColors } from "../components/ui";

const HORIZONS = [20, 100, 500, 2000];
const RUNS = [100, 300, 1000];

type Results = { runs: number; total: number; horizon: number; s: Record<AgentId, Summary> } | null;

const tone = (id: AgentId | "you") => `rgb(var(--${PLAYER_META[id].color}))`;

export function Lab() {
  const { meals, kitchens, go, previousScreen } = useGame();
  const colors = useThemeColors();
  const [horizon, setHorizon] = useState(500);
  const [runs, setRuns] = useState(300);
  const [epsilon, setEpsilon] = useState(0.1);
  const [c, setC] = useState(0.3);
  const [logx, setLogx] = useState(false);
  const [nonce, setNonce] = useState(1);
  const [res, setRes] = useState<Results>(null);

  useEffect(() => {
    let cancelled = false;
    const acc = makeAccumulator(horizon);
    const params = { epsilon, c };
    const seed = 20261019 + nonce;
    const step = () => {
      if (cancelled) return;
      const t0 = performance.now();
      while (acc.runs < runs && performance.now() - t0 < 30) simulateRun(acc, seed, acc.runs, N_PLACES, params);
      const s = {} as Record<AgentId, Summary>;
      AGENT_IDS.forEach((id) => (s[id] = summarise(acc, id)));
      setRes({ runs: acc.runs, total: runs, horizon, s });
      if (acc.runs < runs) setTimeout(step, 0);
    };
    const timer = setTimeout(step, 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [horizon, runs, epsilon, c, nonce]);

  const yourCurve = meals.length === DINNERS ? playerRegret(meals, kitchens) : null;

  const data = useMemo(() => {
    if (!res) return [];
    const T = res.horizon;
    const idx = new Set<number>();
    const n = Math.min(T, 240);
    for (let k = 0; k < n; k++) idx.add(logx ? Math.round(Math.exp((k / (n - 1)) * Math.log(T))) - 1 : Math.round((k / (n - 1)) * (T - 1)));
    return [...idx]
      .sort((a, b) => a - b)
      .map((i) => {
        const o: Record<string, number | number[]> = { t: i + 1 };
        AGENT_IDS.forEach((id) => {
          o[id] = +res.s[id].mean[i].toFixed(3);
          o[`${id}Band`] = [+res.s[id].lo[i].toFixed(3), +res.s[id].hi[i].toFixed(3)];
        });
        if (yourCurve && T === DINNERS) o.you = +yourCurve[i].toFixed(3);
        return o;
      });
  }, [res, logx, yourCurve]);

  const done = res && res.runs >= res.total;
  const lowest = res ? AGENT_IDS.reduce((a, b) => (res.s[a].final <= res.s[b].final ? a : b)) : null;
  const tick = { fill: colors.muted, fontSize: 9, fontFamily: PIXEL_FONT };
  const field = "px-inset w-full px-3 py-2.5 text-ink";

  return (
    <div className="mx-auto grid max-w-6xl gap-10 py-8">
      <header className="grid gap-4">
        <p className="eyebrow">Bonus stage · see the math</p>
        <h1 className="max-w-4xl font-display text-lg leading-[1.5] md:text-3xl md:leading-[1.4]" style={{ textShadow: "3px 3px 0 rgb(var(--star))" }}>
          One week is mostly luck. A thousand weeks is evidence.
        </h1>
        <p className="max-w-3xl text-lg text-muted">
          Here the three strategies play many fresh neighbourhoods of {N_PLACES} restaurants, for as many dinners as you like. Each curve is the average regret (stars missed) across all
          those runs; the shaded band covers one standard deviation either side.
        </p>
      </header>

      <section className="px-panel grid gap-6 p-4 md:p-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-2" htmlFor="lab-horizon">
            <span className="eyebrow text-ink">Dinners per run</span>
            <select id="lab-horizon" value={horizon} onChange={(e) => setHorizon(+e.target.value)} className={field}>
              {HORIZONS.map((h) => (
                <option key={h} value={h}>
                  {h.toLocaleString("en-IN")} {h === DINNERS ? "(1 week)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2" htmlFor="lab-runs">
            <span className="eyebrow text-ink">Neighbourhoods</span>
            <select id="lab-runs" value={runs} onChange={(e) => setRuns(+e.target.value)} className={field}>
              {RUNS.map((r) => (
                <option key={r} value={r}>
                  {r.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2" htmlFor="lab-eps">
            <span className="flex justify-between">
              <span className="eyebrow" style={{ color: tone("eps") }}>
                Ekta's <span className="normal-case">ε</span>
              </span>
              <span className="num font-mono text-[10px] text-gold">{epsilon.toFixed(2)}</span>
            </span>
            <input id="lab-eps" type="range" min={0} max={0.5} step={0.01} value={epsilon} onChange={(e) => setEpsilon(+e.target.value)} />
          </label>
          <label className="grid gap-2" htmlFor="lab-c">
            <span className="flex justify-between">
              <span className="eyebrow" style={{ color: tone("ucb") }}>
                Uday's bonus c
              </span>
              <span className="num font-mono text-[10px] text-gold">{c.toFixed(2)}</span>
            </span>
            <input id="lab-c" type="range" min={0} max={1.5} step={0.01} value={c} onChange={(e) => setC(+e.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {AGENT_IDS.map((id) => (
              <span key={id} className="px-tag" style={{ color: tone(id) }}>
                <span className="h-2 w-2" style={{ background: tone(id) }} />
                {PLAYER_META[id].name} · <span className="normal-case">{PLAYER_META[id].tag}</span>
              </span>
            ))}
            {yourCurve && horizon === DINNERS && (
              <span className="px-tag" style={{ color: tone("you") }}>
                <span className="h-2 w-2" style={{ background: tone("you") }} />
                Your week
              </span>
            )}
          </div>
          <label className="flex items-center gap-3 font-mono text-[9px] uppercase" htmlFor="lab-log">
            <input id="lab-log" type="checkbox" checked={logx} onChange={(e) => setLogx(e.target.checked)} />
            Log time axis
          </label>
        </div>

        <div className="h-80 w-full border-4 border-line bg-sunk p-2">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 10, right: 14, bottom: 4, left: -4 }}>
              <CartesianGrid stroke={colors.line} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale={logx ? "log" : "linear"}
                domain={[1, horizon]}
                allowDataOverflow
                ticks={logx ? [1, 10, 100, 1000].filter((v) => v < horizon).concat(horizon) : [1, ...[0.25, 0.5, 0.75, 1].map((f) => Math.round(horizon * f))]}
                tick={tick}
                stroke={colors.line}
                tickLine={false}
              />
              <YAxis tick={tick} stroke={colors.line} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: colors.surface, border: `4px solid ${colors.edge}`, borderRadius: 0, fontSize: 14 }}
                labelStyle={{ color: colors.gold, fontFamily: PIXEL_FONT, fontSize: 9, marginBottom: 6 }}
                labelFormatter={(t) => `Dinner ${t}`}
                formatter={(v: number | number[], k: string) =>
                  Array.isArray(v) ? [null, null] : [`${v.toFixed(2)} missed`, k === "you" ? "Your week" : PLAYER_META[k as AgentId].name]
                }
              />
              {AGENT_IDS.map((id) => (
                <Area key={`${id}b`} dataKey={`${id}Band`} stroke="none" fill={colors[id]} fillOpacity={0.14} isAnimationActive={false} legendType="none" activeDot={false} />
              ))}
              {AGENT_IDS.map((id) => (
                <Line key={id} dataKey={id} stroke={colors[id]} strokeWidth={3} dot={false} isAnimationActive={false} />
              ))}
              {yourCurve && horizon === DINNERS && <Line type="stepAfter" dataKey="you" stroke={colors.you} strokeDasharray="6 4" strokeWidth={3} dot={false} isAnimationActive={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="grid gap-2">
            <span className="num font-mono text-[9px] uppercase text-muted">
              {res
                ? done
                  ? `Ready! ${res.runs.toLocaleString("en-IN")} neighbourhoods × ${res.horizon.toLocaleString("en-IN")} dinners`
                  : `Loading… ${res.runs} / ${res.total} neighbourhoods`
                : "Loading…"}
            </span>
            <ChunkyBar value={res?.runs ?? 0} max={res?.total ?? runs} segments={24} color={done ? "var(--good)" : "var(--star)"} />
          </div>
          <Button variant="ghost" onClick={() => setNonce((n) => n + 1)}>
            ↻ New neighbourhoods
          </Button>
        </div>

        <div className="overflow-x-auto border-4 border-line">
          <table className="w-full min-w-[640px]">
            <thead className="bg-sunk text-left">
              <tr>
                {["Strategy", "Stars missed", "Best place, last 10%", "Exploring"].map((h, i) => (
                  <th key={h} className={`px-3 py-3 font-mono text-[9px] font-normal uppercase text-muted ${i ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENT_IDS.map((id) => (
                <tr key={id} className="border-t-4 border-line">
                  <td className="px-3 py-3">
                    <span className="flex flex-wrap items-center gap-3">
                      <Avatar id={id} size={24} />
                      <span className="font-mono text-[10px] uppercase" style={{ color: tone(id) }}>
                        {PLAYER_META[id].name}
                      </span>
                      <span className="text-muted">{PLAYER_META[id].tag}</span>
                      {done && lowest === id && <span className="px-tag bg-star text-black">Lowest regret</span>}
                    </span>
                  </td>
                  <td className="num px-3 py-3 text-right font-mono text-xs">
                    {res ? res.s[id].final.toFixed(1) : "–"} <span className="text-[9px] text-muted">± {res ? res.s[id].sd.toFixed(1) : "–"}</span>
                  </td>
                  <td className="num px-3 py-3 text-right font-mono text-xs">{res ? (res.s[id].bestShareLate * 100).toFixed(1) + "%" : "–"}</td>
                  <td className="num px-3 py-3 text-right font-mono text-xs">{res ? (res.s[id].exploringShare * 100).toFixed(1) + "%" : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Straight line vs. a curve that flattens",
            body: "Ekta never stops her random nights, so with a constant ε she keeps losing about ε × the average gap every dinner: her regret becomes a straight line. Uday and Tara explore less and less as they grow confident, so their regret grows like log t. Turn on the log time axis and a log curve becomes a straight line.",
          },
          {
            title: "Why one week can't settle it",
            body: `With ${N_PLACES} places and ${DINNERS} dinners, UCB1 spends ${N_PLACES} dinners just trying each place once, and nobody learns much. The averages end up close and the spread is wide, which is why you can beat all three in a single week. Set dinners to 20, then to 2,000, and watch the strategies separate.`,
          },
          {
            title: "Try breaking them",
            body: "Set ε to 0: Ekta sticks with whatever impressed her first and often never finds the best kitchen. Set c to 0: Uday turns greedy too. Push c past 1 and he over-explores, spending dinners re-checking places he already knows are worse.",
          },
        ].map((card) => (
          <div key={card.title} className="px-panel grid content-start gap-3 p-5">
            <h3 className="font-display text-[11px] uppercase leading-relaxed text-gold">{card.title}</h3>
            <p className="text-lg leading-snug text-muted">{card.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4">
        <h2 className="font-display text-sm uppercase md:text-base">The three rules, precisely</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {FRIENDS.map((f) => (
            <div key={f.id} className="px-panel grid content-start gap-3 p-5">
              <p className="text-xl font-semibold" style={{ color: tone(f.id) }}>
                {f.algorithm}
              </p>
              <code className="border-4 border-line bg-sunk px-3 py-2 font-sans text-base leading-snug text-gold">{f.rule}</code>
              <p className="leading-snug text-muted">
                {f.id === "eps" && "Q̂ₐ is the average rating of place a so far. Ratings are mapped to 0–1 as (stars − 1) / 4 before learning."}
                {f.id === "ucb" &&
                  "t is the dinner number and nₐ the visits to a. c sets how optimistic to be: the textbook √2 assumes rewards spread over all of 0–1; meal ratings wobble about ±0.2 on that scale, so c ≈ 0.2·√2 ≈ 0.3 fits."}
                {f.id === "ts" &&
                  "Prior belief: quality ~ N(0.5, 0.25²). After nₐ meals with total S, the posterior is Normal with precision 1/0.25² + nₐ/0.2² and mean (0.5/0.25² + S/0.2²) / precision."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-4 border-t-4 border-line pt-6">
        <Button onClick={() => go(previousScreen === "reveal" ? "reveal" : meals.length >= DINNERS ? "reveal" : "play")}>
          {meals.length >= DINNERS ? "◀ Back to my week" : meals.length ? "◀ Back to the game" : "▶ Play a week"}
        </Button>
        <Button variant="gold" onClick={() => go("notebook")}>
          Read the full analysis ▶
        </Button>
      </div>
    </div>
  );
}
