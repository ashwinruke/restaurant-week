import { create } from "zustand";
import {
  AGENT_IDS,
  Kitchens,
  makeAgent,
  mix,
  mulberry32,
  neighbourhoodQualities,
  playAgent,
  randomSeed,
  regretCurve,
  type AgentId,
  type Episode,
} from "../bandits";
import { DINNERS, N_PLACES, PLACES, type Place } from "../game/data";

export type Screen = "intro" | "play" | "reveal" | "lab" | "notebook";

export interface Restaurant extends Place {
  quality: number;
}

export interface Meal {
  day: number;
  arm: number;
  rating: number;
}

interface GameState {
  screen: Screen;
  seed: number;
  restaurants: Restaurant[];
  kitchens: Kitchens;
  meals: Meal[];
  friends: Record<AgentId, Episode>;
  previousScreen: Screen;

  go: (s: Screen) => void;
  newWeek: (seed?: number) => void;
  replay: () => void;
  eat: (arm: number) => void;
}

function buildWeek(seed: number) {
  const rng = mulberry32(mix(seed, 1));
  const pool = [...PLACES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const qualities = neighbourhoodQualities(N_PLACES, rng);
  const restaurants = pool.slice(0, N_PLACES).map((p, i) => ({ ...p, quality: qualities[i] }));
  const kitchens = new Kitchens(qualities, mix(seed, 2));

  // The friends play the same week with the same kitchens (and the same luck per visit).
  const friends = {} as Record<AgentId, Episode>;
  AGENT_IDS.forEach((id, i) => {
    friends[id] = playAgent(makeAgent(id, N_PLACES, mix(seed, 3, i)), new Kitchens(qualities, mix(seed, 2)), DINNERS);
  });
  return { seed, restaurants, kitchens, friends, meals: [] as Meal[] };
}

export const useGame = create<GameState>((set, get) => ({
  screen: "intro",
  previousScreen: "intro",
  ...buildWeek(randomSeed()),

  go: (screen) => set({ screen, previousScreen: get().screen }),

  newWeek: (seed) => set({ ...buildWeek(seed ?? randomSeed()), screen: "play" }),

  replay: () => set({ ...buildWeek(get().seed), screen: "play" }),

  eat: (arm) => {
    const { meals, kitchens } = get();
    if (meals.length >= DINNERS) return;
    const visit = meals.filter((m) => m.arm === arm).length;
    set({ meals: [...meals, { day: meals.length + 1, arm, rating: kitchens.rating(arm, visit) }] });
  },
}));

/** Your cumulative regret, computed the same way as the friends'. */
export function playerRegret(meals: Meal[], kitchens: Kitchens) {
  return regretCurve(
    meals.map((m) => m.arm),
    kitchens,
  );
}

/** Whether each of your meals was "exploring": somewhere other than your best-average place so far. */
export function playerExploring(meals: Meal[]) {
  const sums: Record<number, [number, number]> = {};
  return meals.map((m) => {
    const tried = Object.entries(sums);
    let best = -Infinity;
    for (const [, [s, n]] of tried) best = Math.max(best, s / n);
    const mine = sums[m.arm];
    const explored = tried.length > 0 && (!mine || mine[0] / mine[1] < best - 1e-12);
    sums[m.arm] = mine ? [mine[0] + m.rating, mine[1] + 1] : [m.rating, 1];
    return explored;
  });
}
