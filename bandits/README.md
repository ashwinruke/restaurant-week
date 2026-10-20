# restaurant-bandits

ε-greedy, UCB1 and Thompson sampling for multi-armed bandits, with tools to measure and compare regret. This is the Python side of [Restaurant Week](../README.md).

```python
from bandits import EpsilonGreedy, UCB1, BernoulliThompson, BernoulliBandit, run_experiment

agents = {
    "ε-greedy": lambda k, s: EpsilonGreedy(k, epsilon=0.1, seed=s),
    "UCB1": lambda k, s: UCB1(k, seed=s),
    "Thompson": lambda k, s: BernoulliThompson(k, seed=s),
}
results = run_experiment(agents, lambda s: BernoulliBandit([0.2, 0.5, 0.7], seed=s), horizon=2000, runs=100)
for name, r in results.items():
    print(name, round(r.final_regret, 1))
```

## Modules

- `envs.py`: `BernoulliBandit`, `GaussianBandit`, `StarRatingBandit` (the game's 1–5 star world) and `random_neighbourhood`. Every arm has its own seeded generator, so agents compared on the same seed see the same rewards (common random numbers).
- `agents.py`: `EpsilonGreedy` (constant or decaying ε), `UCB1`, `BernoulliThompson` (Beta posterior), `GaussianThompson` (Normal posterior, known noise). All share `select()` / `update(arm, reward)`.
- `simulate.py`: `run_episode`, `run_experiment` (mean, std, optimal-arm rate, pulls per arm) and `lai_robbins_bound`.
- `__main__.py`: `python -m bandits --horizon 1000 --runs 200 --plot regret.png`.

## Tests

`pytest` checks unit behaviour (UCB tries every arm first, posteriors concentrate, seeds are deterministic) and the statistical behaviour theory predicts: UCB1 and Thompson regret is sub-linear, constant-ε regret is linear with slope ≈ ε × average gap, Thompson beats constant ε in the long run, and identical agents on identical seeds produce identical regret.
