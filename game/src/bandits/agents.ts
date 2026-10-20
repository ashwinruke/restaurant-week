import { gauss, mulberry32, type Rng } from "./rng";

/** What an agent decided at one step, plus enough detail to explain it. */
export interface Decision {
  arm: number;
  /** The chosen arm's average was below the best average so far (it tried something other than its favourite). */
  explored: boolean;
  /** ε-greedy only: this was a random pull. */
  random?: boolean;
  /** UCB: upper bound used. Thompson: the sampled value. ε-greedy: the estimate. */
  score: number;
  /** The chosen arm's average so far (unit scale), or null if never tried. */
  estimate: number | null;
}

/** Shared bookkeeping for every strategy. Rewards are on the unit scale [0, 1]. */
export abstract class Agent {
  abstract readonly name: string;
  counts: Int32Array;
  sums: Float64Array;
  t = 0;
  protected rng: Rng;

  constructor(
    public readonly k: number,
    seed: number,
  ) {
    this.counts = new Int32Array(k);
    this.sums = new Float64Array(k);
    this.rng = mulberry32(seed);
  }

  /** Q̂_a: average reward of arm a (0 if never pulled). */
  estimate(a: number) {
    return this.counts[a] ? this.sums[a] / this.counts[a] : 0;
  }

  /** argmax with random tie-breaking. */
  protected argmax(scores: ArrayLike<number>): number {
    let best = -Infinity;
    let idx = 0;
    let ties = 0;
    for (let a = 0; a < this.k; a++) {
      const v = scores[a];
      if (v > best) {
        best = v;
        idx = a;
        ties = 1;
      } else if (v === best) {
        ties++;
        if (this.rng() * ties < 1) idx = a;
      }
    }
    return idx;
  }

  /** True when `arm` is not (one of) the current best-average arm(s) among those tried. */
  isExploring(arm: number): boolean {
    let mx = -Infinity;
    for (let a = 0; a < this.k; a++) if (this.counts[a]) mx = Math.max(mx, this.sums[a] / this.counts[a]);
    if (mx === -Infinity) return false;
    if (!this.counts[arm]) return true;
    return this.sums[arm] / this.counts[arm] < mx - 1e-12;
  }

  protected decide(arm: number, score: number, extra: Partial<Decision> = {}): Decision {
    return {
      arm,
      score,
      explored: this.isExploring(arm),
      estimate: this.counts[arm] ? this.estimate(arm) : null,
      ...extra,
    };
  }

  abstract select(): Decision;

  update(arm: number, reward: number) {
    this.counts[arm]++;
    this.sums[arm] += reward;
    this.t++;
  }
}

/** With probability ε try a random arm, otherwise take the best average. */
export class EpsilonGreedy extends Agent {
  readonly name = "ε-greedy";

  constructor(
    k: number,
    seed: number,
    public epsilon = 0.1,
    /** If set, ε shrinks as ε · decay / (decay + t). */
    public decay: number | null = null,
  ) {
    super(k, seed);
  }

  currentEpsilon() {
    return this.decay == null ? this.epsilon : (this.epsilon * this.decay) / (this.decay + this.t + 1);
  }

  select(): Decision {
    if (this.rng() < this.currentEpsilon()) {
      const arm = Math.floor(this.rng() * this.k);
      return this.decide(arm, this.estimate(arm), { random: true });
    }
    const q = Array.from({ length: this.k }, (_, a) => this.estimate(a));
    const arm = this.argmax(q);
    return this.decide(arm, q[arm], { random: false });
  }
}

/**
 * UCB1: pull argmax Q̂_a + c·√(ln t / n_a); never-pulled arms have an infinite bound.
 * c = 0.3 ≈ σ√2 suits star ratings (σ ≈ 0.2 on the unit scale); √2 is the textbook value for rewards spread over all of [0, 1].
 */
export class UCB1 extends Agent {
  readonly name = "UCB1";

  constructor(
    k: number,
    seed: number,
    public c = 0.3,
  ) {
    super(k, seed);
  }

  upperBound(a: number) {
    if (!this.counts[a]) return Infinity;
    return this.estimate(a) + this.c * Math.sqrt(Math.log(this.t + 1) / this.counts[a]);
  }

  select(): Decision {
    const u = Array.from({ length: this.k }, (_, a) => this.upperBound(a));
    const arm = this.argmax(u);
    return this.decide(arm, u[arm]);
  }
}

/**
 * Thompson sampling with a Normal prior N(m₀, τ₀²) and known noise σ:
 * posterior precision = 1/τ₀² + n/σ², mean = (m₀/τ₀² + S/σ²) / precision.
 * Sample one plausible quality per arm and pull the highest.
 */
export class GaussianThompson extends Agent {
  readonly name = "Thompson sampling";

  constructor(
    k: number,
    seed: number,
    public priorMean = 0.5,
    public priorStd = 0.25,
    public noiseStd = 0.2,
  ) {
    super(k, seed);
  }

  posterior(a: number) {
    const precision = 1 / this.priorStd ** 2 + this.counts[a] / this.noiseStd ** 2;
    const mean = (this.priorMean / this.priorStd ** 2 + this.sums[a] / this.noiseStd ** 2) / precision;
    return { mean, std: 1 / Math.sqrt(precision) };
  }

  select(): Decision {
    const draws = Array.from({ length: this.k }, (_, a) => {
      const { mean, std } = this.posterior(a);
      return mean + std * gauss(this.rng);
    });
    const arm = this.argmax(draws);
    return this.decide(arm, draws[arm]);
  }
}
