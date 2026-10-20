"""Run agents on environments and measure regret.

Regret here is *pseudo-regret*: at each step we add the gap Δ = μ* − μ_{chosen arm}.
It measures the quality of the decisions, independent of the reward noise.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Mapping

import numpy as np

from .agents import Agent
from .envs import BanditEnv

AgentFactory = Callable[[int, int], Agent]  # (n_arms, seed) -> agent
EnvFactory = Callable[[int], BanditEnv]  # (seed) -> environment


@dataclass
class EpisodeResult:
    actions: np.ndarray
    rewards: np.ndarray
    regret: np.ndarray  # per-step gap of the chosen arm

    @property
    def cumulative_regret(self) -> np.ndarray:
        return np.cumsum(self.regret)


@dataclass
class ExperimentResult:
    name: str
    cumulative_regret: np.ndarray  # shape (runs, horizon)
    optimal: np.ndarray  # shape (runs, horizon), True when an optimal arm was pulled
    pulls: np.ndarray  # shape (runs, n_arms)

    @property
    def mean(self) -> np.ndarray:
        return self.cumulative_regret.mean(axis=0)

    @property
    def std(self) -> np.ndarray:
        return self.cumulative_regret.std(axis=0)

    @property
    def optimal_rate(self) -> np.ndarray:
        return self.optimal.mean(axis=0)

    @property
    def final_regret(self) -> float:
        return float(self.mean[-1])


def run_episode(agent: Agent, env: BanditEnv, horizon: int) -> EpisodeResult:
    """Play `horizon` steps. The agent sees rewards on the env's unit scale."""
    if horizon < 1:
        raise ValueError("horizon must be positive")
    agent.reset()
    gaps = env.gaps
    actions = np.empty(horizon, dtype=np.int64)
    rewards = np.empty(horizon)
    for t in range(horizon):
        arm = agent.select()
        reward = env.pull(arm)
        agent.update(arm, env.to_unit(reward))
        actions[t], rewards[t] = arm, reward
    return EpisodeResult(actions, rewards, gaps[actions])


def run_experiment(
    agents: Mapping[str, AgentFactory],
    make_env: EnvFactory,
    horizon: int,
    runs: int,
    seed: int = 0,
) -> dict[str, ExperimentResult]:
    """Average every agent over `runs` independent episodes.

    In run i every agent faces an environment built from the same seed, so they
    see identical reward streams (common random numbers).
    """
    run_seeds = np.random.SeedSequence(seed).generate_state(runs * 2).reshape(runs, 2)
    out: dict[str, ExperimentResult] = {}
    for idx, (name, factory) in enumerate(agents.items()):
        cum = np.empty((runs, horizon))
        opt = np.empty((runs, horizon), dtype=bool)
        pulls = None
        for r in range(runs):
            env_seed, agent_seed = int(run_seeds[r, 0]), int(run_seeds[r, 1]) + idx
            env = make_env(env_seed)
            agent = factory(env.n_arms, agent_seed)
            ep = run_episode(agent, env, horizon)
            cum[r] = ep.cumulative_regret
            opt[r] = np.isin(ep.actions, env.optimal_arms)
            if pulls is None:
                pulls = np.zeros((runs, env.n_arms))
            pulls[r] = np.bincount(ep.actions, minlength=env.n_arms)
        out[name] = ExperimentResult(name, cum, opt, pulls)
    return out


def lai_robbins_bound(means: np.ndarray, sigma: float | None = None) -> float:
    """Constant C such that regret(T) ≳ C · ln T for any consistent policy.

    Bernoulli arms (sigma=None): C = Σ Δ_a / KL(μ_a, μ*)
    Gaussian arms with noise σ:  C = Σ 2σ² / Δ_a
    """
    means = np.asarray(means, dtype=float)
    best = means.max()
    total = 0.0
    for m in means:
        gap = best - m
        if gap < 1e-12:
            continue
        if sigma is None:
            p, q = np.clip([m, best], 1e-12, 1 - 1e-12)
            kl = p * np.log(p / q) + (1 - p) * np.log((1 - p) / (1 - q))
            total += gap / kl
        else:
            total += 2 * sigma**2 / gap
    return float(total)
