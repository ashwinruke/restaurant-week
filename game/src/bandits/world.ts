import { gauss, mix, mulberry32, type Rng } from "./rng";

/** How much a single meal's rating wobbles around the kitchen's true quality, in stars. */
export const SIGMA = 0.8;

/** Stars (1–5) to the unit scale the agents learn on. */
export const toUnit = (stars: number) => (stars - 1) / 4;

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * True kitchen qualities for one neighbourhood: one standout, a close runner-up,
 * the rest middling. Mirrors `random_neighbourhood` in the Python package.
 */
export function neighbourhoodQualities(n: number, rng: Rng): number[] {
  const best = 4.2 + 0.4 * rng();
  const runnerUp = best - (0.3 + 0.3 * rng());
  const q = [best, runnerUp];
  for (let i = 2; i < n; i++) q.push(1.8 + 1.8 * rng());
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  return q.map(round2);
}

/**
 * The kitchens of one neighbourhood.
 *
 * Each restaurant has its own stream of ratings: your 3rd visit to a place gets
 * the same rating as anyone else's 3rd visit there. That is "common random
 * numbers": when two diners' totals differ, it is because they chose differently,
 * not because one got luckier dice.
 */
export class Kitchens {
  private rngs: Rng[];
  private cache: number[][];

  constructor(
    public readonly means: number[],
    seed: number,
    public readonly sigma = SIGMA,
  ) {
    this.rngs = means.map((_, a) => mulberry32(mix(seed, a + 1, 77)));
    this.cache = means.map(() => []);
  }

  get size() {
    return this.means.length;
  }

  get best() {
    return Math.max(...this.means);
  }

  /** Δ_a: how many stars per dinner you lose, on average, by eating at `a` instead of the best place. */
  gap(arm: number) {
    return this.best - this.means[arm];
  }

  isBest(arm: number) {
    return this.gap(arm) < 1e-9;
  }

  /** Rating (1–5 in half stars) of the `visit`-th meal (0-based) at restaurant `arm`. */
  rating(arm: number, visit: number): number {
    const c = this.cache[arm];
    while (c.length <= visit) {
      const raw = this.means[arm] + this.sigma * gauss(this.rngs[arm]);
      c.push(Math.min(5, Math.max(1, Math.round(raw * 2) / 2)));
    }
    return c[visit];
  }
}
