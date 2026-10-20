"""Bandit environments.

Every arm owns its own random number generator. If two agents play two copies
of an environment built from the same seed, the n-th pull of arm `a` returns the
same reward for both of them ("common random numbers"). Differences in their
regret then come from their decisions, not from one of them getting luckier.
"""

from __future__ import annotations

import numpy as np


class BanditEnv:
    """Base class: a fixed set of arms with known true means (hidden from agents)."""

    def __init__(self, means, seed: int | None = None):
        self.means = np.asarray(means, dtype=float)
        if self.means.ndim != 1 or self.means.size < 2:
            raise ValueError("need a 1-D array of at least two arm means")
        self.seed = seed
        self.reset(seed)

    def reset(self, seed: int | None = None) -> None:
        """Rebuild the per-arm generators so the reward streams start over."""
        children = np.random.SeedSequence(seed).spawn(self.n_arms)
        self._arm_rngs = [np.random.default_rng(c) for c in children]

    @property
    def n_arms(self) -> int:
        return int(self.means.size)

    @property
    def best_mean(self) -> float:
        return float(self.means.max())

    @property
    def gaps(self) -> np.ndarray:
        """Δ_a = μ* − μ_a for every arm."""
        return self.best_mean - self.means

    @property
    def optimal_arms(self) -> np.ndarray:
        return np.flatnonzero(np.isclose(self.gaps, 0.0))

    def pull(self, arm: int) -> float:  # pragma: no cover - abstract
        raise NotImplementedError

    def to_unit(self, reward: float) -> float:
        """Map a raw reward into the scale the agents learn on. Identity by default."""
        return reward


class BernoulliBandit(BanditEnv):
    """Each pull pays 1 with probability μ_a, otherwise 0."""

    def __init__(self, means, seed: int | None = None):
        super().__init__(means, seed)
        if np.any((self.means < 0) | (self.means > 1)):
            raise ValueError("Bernoulli means must lie in [0, 1]")

    def pull(self, arm: int) -> float:
        return float(self._arm_rngs[arm].random() < self.means[arm])


class GaussianBandit(BanditEnv):
    """Each pull pays μ_a + N(0, σ²)."""

    def __init__(self, means, sigma: float = 1.0, seed: int | None = None):
        self.sigma = float(sigma)
        super().__init__(means, seed)

    def pull(self, arm: int) -> float:
        return float(self.means[arm] + self.sigma * self._arm_rngs[arm].standard_normal())


class StarRatingBandit(GaussianBandit):
    """The Restaurant Week world: a meal earns 1–5 stars in half-star steps.

    rating = clip(round_to_half(μ_a + σ·z), 1, 5)

    Agents learn on the unit scale (rating − 1) / 4, so the same algorithm
    settings work for stars, Bernoulli rewards and anything else in [0, 1].
    """

    def __init__(self, means, sigma: float = 0.8, seed: int | None = None):
        super().__init__(means, sigma, seed)

    def pull(self, arm: int) -> float:
        raw = super().pull(arm)
        return float(np.clip(np.round(raw * 2) / 2, 1.0, 5.0))

    def to_unit(self, reward: float) -> float:
        return (reward - 1.0) / 4.0


def random_neighbourhood(n_arms: int = 8, seed: int | None = None) -> np.ndarray:
    """Restaurant qualities like the game uses: one standout, one close runner-up, the rest middling."""
    rng = np.random.default_rng(seed)
    best = rng.uniform(4.2, 4.6)
    runner_up = best - rng.uniform(0.3, 0.6)
    rest = rng.uniform(1.8, 3.6, size=n_arms - 2)
    means = np.concatenate([[best, runner_up], rest])
    rng.shuffle(means)
    return np.round(means, 2)
