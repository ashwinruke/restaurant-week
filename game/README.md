# Restaurant Week: the game

React 18 + TypeScript + Vite, styled with Tailwind CSS, animated with Framer Motion, state in Zustand, charts with Recharts.

```bash
npm install
npm run dev       # play locally
npm test          # Vitest: agents, kitchens, regret properties
npm run build     # static site in dist/ (works from any sub-path)
```

## Screens

1. **Intro**: the neighbourhood, the 8 restaurants and the three friends' mottos.
2. **Play**: 20 dinners. Each card keeps your diary for that place (visits, average, every rating).
3. **Reveal**: ranking by stars missed (regret), interactive regret curves, a dinner-by-dinner timeline for all four players, the true kitchen qualities, and how each friend's algorithm works. *Replay this week* keeps the same restaurants and luck.
4. **The math**: averages the three strategies over many neighbourhoods with adjustable horizon, ε and c, a log-time toggle, and ±1 SD bands.

## Code map

- `src/bandits/`: framework-free TypeScript. `rng.ts` (seeded mulberry32), `world.ts` (kitchens with per-restaurant rating streams), `agents.ts` (ε-greedy, UCB1, Gaussian Thompson sampling), `simulate.ts` (episodes, accumulators, summaries).
- `src/game/data.ts`: restaurants, friends and copy.
- `src/store/game.ts`: builds a week from a seed and runs the friends' weeks up front.
- `src/screens/`: one component per screen.
