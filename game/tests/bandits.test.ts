import {
  EpsilonGreedy,
  GaussianThompson,
  Kitchens,
  UCB1,
  makeAccumulator,
  mulberry32,
  neighbourhoodQualities,
  playAgent,
  regretCurve,
  simulateRun,
  summarise,
} from "../src/bandits";

const MEANS = [2.1, 3.0, 4.4, 3.9, 2.6, 3.3, 1.9, 2.8];

describe("Kitchens", () => {
  it("gives the n-th visit to a place the same rating for everyone (common random numbers)", () => {
    const a = new Kitchens(MEANS, 42);
    const b = new Kitchens(MEANS, 42);
    const first = [a.rating(2, 0), a.rating(2, 1), a.rating(5, 0)];
    expect([b.rating(5, 0), b.rating(2, 1), b.rating(2, 0)]).toEqual([first[2], first[1], first[0]]);
  });

  it("rates in half stars between 1 and 5", () => {
    const k = new Kitchens([1.1, 4.9], 7, 1.5);
    for (let v = 0; v < 300; v++)
      for (const arm of [0, 1]) {
        const r = k.rating(arm, v);
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(5);
        expect(Number.isInteger(r * 2)).toBe(true);
      }
  });

  it("computes gaps from the best kitchen", () => {
    const k = new Kitchens(MEANS, 1);
    expect(k.isBest(2)).toBe(true);
    expect(k.gap(0)).toBeCloseTo(2.3);
    expect(regretCurve([2, 2, 0], k)).toEqual([0, 0, expect.closeTo(2.3)]);
  });

  it("builds neighbourhoods with a clear standout", () => {
    const q = neighbourhoodQualities(8, mulberry32(3)).sort((x, y) => y - x);
    expect(q[0]).toBeGreaterThanOrEqual(4.2);
    expect(q[0] - q[1]).toBeGreaterThanOrEqual(0.29);
  });
});

describe("agents", () => {
  it("ε-greedy with ε = 0 always exploits", () => {
    const agent = new EpsilonGreedy(4, 1, 0);
    agent.update(3, 0.9);
    for (let i = 0; i < 30; i++) expect(agent.select().arm).toBe(3);
  });

  it("UCB1 tries every place once first", () => {
    const agent = new UCB1(8, 5);
    const seen = new Set<number>();
    for (let i = 0; i < 8; i++) {
      const d = agent.select();
      seen.add(d.arm);
      agent.update(d.arm, 0.5);
    }
    expect(seen.size).toBe(8);
  });

  it("Thompson posterior concentrates on the truth", () => {
    const agent = new GaussianThompson(2, 0);
    const r = mulberry32(9);
    for (let i = 0; i < 400; i++) agent.update(0, 0.8 + 0.2 * (r() - 0.5));
    const p = agent.posterior(0);
    expect(p.mean).toBeCloseTo(0.8, 1);
    expect(p.std).toBeLessThan(0.02);
    expect(agent.posterior(1).std).toBeCloseTo(0.25);
  });

  it("is deterministic for a given seed", () => {
    const run = () => playAgent(new GaussianThompson(8, 11), new Kitchens(MEANS, 3), 50).choices;
    expect(run()).toEqual(run());
  });
});

describe("regret over many runs", () => {
  const acc = makeAccumulator(1000);
  for (let r = 0; r < 60; r++) simulateRun(acc, 123, r, 8, { epsilon: 0.1, c: 0.3 });

  it("UCB1 and Thompson grow sub-linearly", () => {
    for (const id of ["ucb", "ts"] as const) {
      const m = summarise(acc, id).mean;
      expect(m[999]).toBeLessThan(5 * m[99]);
    }
  });

  it("Thompson beats constant-ε greedy in the long run", () => {
    expect(summarise(acc, "ts").final).toBeLessThan(summarise(acc, "eps").final);
  });

  it("regret never decreases", () => {
    const m = summarise(acc, "eps").mean;
    for (let t = 1; t < m.length; t++) expect(m[t]).toBeGreaterThanOrEqual(m[t - 1]);
  });
});
