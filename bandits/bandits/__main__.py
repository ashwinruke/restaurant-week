"""Command-line comparison of the three strategies on Restaurant Week neighbourhoods.

    python -m bandits --horizon 500 --runs 200
    python -m bandits --horizon 2000 --runs 100 --plot regret.png
"""

from __future__ import annotations

import argparse

from .agents import UCB1, EpsilonGreedy, GaussianThompson
from .envs import StarRatingBandit, random_neighbourhood
from .simulate import run_experiment


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="Compare ε-greedy, UCB1 and Thompson sampling.")
    p.add_argument("--arms", type=int, default=8, help="restaurants per neighbourhood (default 8)")
    p.add_argument("--horizon", type=int, default=500, help="dinners per run (default 500)")
    p.add_argument("--runs", type=int, default=200, help="runs to average (default 200)")
    p.add_argument("--epsilon", type=float, default=0.1)
    p.add_argument("--c", type=float, default=0.3,
                   help="UCB1 exploration constant (default 0.3 ≈ σ√2 for star ratings on the unit scale)")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--plot", metavar="PATH", help="save a regret-curve plot (needs matplotlib)")
    args = p.parse_args(argv)

    def make_env(seed: int) -> StarRatingBandit:
        return StarRatingBandit(random_neighbourhood(args.arms, seed), sigma=0.8, seed=seed)

    agents = {
        "ε-greedy": lambda k, s: EpsilonGreedy(k, epsilon=args.epsilon, seed=s),
        "UCB1": lambda k, s: UCB1(k, c=args.c, seed=s),
        "Thompson sampling": lambda k, s: GaussianThompson(k, seed=s),
    }
    results = run_experiment(agents, make_env, args.horizon, args.runs, args.seed)

    t9 = int(args.horizon * 0.9)
    print(f"{args.runs} runs × {args.horizon} dinners, {args.arms} restaurants\n")
    print(f"{'strategy':<20}{'stars missed':>14}{'± sd':>8}{'best place, last 10%':>24}")
    for name, r in results.items():
        print(f"{name:<20}{r.final_regret:>14.2f}{r.std[-1]:>8.2f}{r.optimal_rate[t9:].mean() * 100:>23.1f}%")

    if args.plot:
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(8, 4.5))
        x = range(1, args.horizon + 1)
        for name, r in results.items():
            ax.plot(x, r.mean, label=name)
            ax.fill_between(x, r.mean - r.std, r.mean + r.std, alpha=0.15)
        ax.set(xlabel="dinner", ylabel="cumulative stars missed (regret)", title="Average regret")
        ax.legend()
        fig.tight_layout()
        fig.savefig(args.plot, dpi=150)
        print(f"\nSaved {args.plot}")


if __name__ == "__main__":
    main()
