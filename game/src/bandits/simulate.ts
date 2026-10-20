import { Agent, EpsilonGreedy, GaussianThompson, UCB1, type Decision } from "./agents";
import { mix, mulberry32 } from "./rng";
import { Kitchens, neighbourhoodQualities, toUnit } from "./world";

export type AgentId = "eps" | "ucb" | "ts";
export const AGENT_IDS: AgentId[] = ["eps", "ucb", "ts"];

export interface AgentParams {
  epsilon: number;
  c: number;
}
export const DEFAULT_PARAMS: AgentParams = { epsilon: 0.1, c: 0.3 };

export function makeAgent(id: AgentId, k: number, seed: number, p: AgentParams = DEFAULT_PARAMS): Agent {
  if (id === "eps") return new EpsilonGreedy(k, seed, p.epsilon);
  if (id === "ucb") return new UCB1(k, seed, p.c);
  return new GaussianThompson(k, seed);
}

export interface Episode {
  choices: number[];
  ratings: number[];
  decisions: Decision[];
  /** Cumulative regret (stars missed) after each dinner. */
  cumRegret: number[];
}

/** Cumulative pseudo-regret of a sequence of choices: Σ (best quality − quality of the chosen place). */
export function regretCurve(choices: number[], kitchens: Kitchens): number[] {
  let total = 0;
  return choices.map((a) => (total += kitchens.gap(a)));
}

/** Let an agent eat `horizon` dinners. Its n-th visit to a place gets that place's n-th rating. */
export function playAgent(agent: Agent, kitchens: Kitchens, horizon: number): Episode {
  const visits = new Array(kitchens.size).fill(0);
  const choices: number[] = [];
  const ratings: number[] = [];
  const decisions: Decision[] = [];
  for (let t = 0; t < horizon; t++) {
    const d = agent.select();
    const r = kitchens.rating(d.arm, visits[d.arm]++);
    agent.update(d.arm, toUnit(r));
    choices.push(d.arm);
    ratings.push(r);
    decisions.push(d);
  }
  return { choices, ratings, decisions, cumRegret: regretCurve(choices, kitchens) };
}

/** Running sums for averaging many runs without storing them all. */
export interface Accumulator {
  runs: number;
  horizon: number;
  sum: Record<AgentId, Float64Array>;
  sq: Record<AgentId, Float64Array>;
  optimal: Record<AgentId, Float64Array>;
  exploring: Record<AgentId, number>;
}

export function makeAccumulator(horizon: number): Accumulator {
  const rec = () => ({ eps: new Float64Array(horizon), ucb: new Float64Array(horizon), ts: new Float64Array(horizon) });
  return { runs: 0, horizon, sum: rec(), sq: rec(), optimal: rec(), exploring: { eps: 0, ucb: 0, ts: 0 } };
}

/** One fresh neighbourhood, all three agents, added into `acc`. */
export function simulateRun(acc: Accumulator, seed: number, run: number, nArms: number, p: AgentParams): void {
  const means = neighbourhoodQualities(nArms, mulberry32(mix(seed, run, 5)));
  AGENT_IDS.forEach((id, i) => {
    const kitchens = new Kitchens(means, mix(seed, run, 9));
    const agent = makeAgent(id, nArms, mix(seed, run, i + 1, 31), p);
    const visits = new Array(nArms).fill(0);
    let cr = 0;
    for (let t = 0; t < acc.horizon; t++) {
      const d = agent.select();
      if (d.explored) acc.exploring[id]++;
      agent.update(d.arm, toUnit(kitchens.rating(d.arm, visits[d.arm]++)));
      cr += kitchens.gap(d.arm);
      acc.sum[id][t] += cr;
      acc.sq[id][t] += cr * cr;
      if (kitchens.isBest(d.arm)) acc.optimal[id][t]++;
    }
  });
  acc.runs++;
}

export interface Summary {
  mean: number[];
  lo: number[];
  hi: number[];
  final: number;
  sd: number;
  bestShareLate: number;
  exploringShare: number;
}

export function summarise(acc: Accumulator, id: AgentId): Summary {
  const R = Math.max(1, acc.runs);
  const T = acc.horizon;
  const mean: number[] = [];
  const lo: number[] = [];
  const hi: number[] = [];
  for (let t = 0; t < T; t++) {
    const m = acc.sum[id][t] / R;
    const sd = Math.sqrt(Math.max(0, acc.sq[id][t] / R - m * m));
    mean.push(m);
    lo.push(Math.max(0, m - sd));
    hi.push(m + sd);
  }
  const from = Math.floor(T * 0.9);
  let opt = 0;
  for (let t = from; t < T; t++) opt += acc.optimal[id][t];
  return {
    mean,
    lo,
    hi,
    final: mean[T - 1],
    sd: hi[T - 1] - mean[T - 1],
    bestShareLate: opt / ((T - from) * R),
    exploringShare: acc.exploring[id] / (R * T),
  };
}
