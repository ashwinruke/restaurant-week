"""Bandit agents: ε-greedy, UCB1 and Thompson sampling.

Every agent exposes the same two methods:

    arm = agent.select()        # decide what to pull at the next step
    agent.update(arm, reward)   # learn from what happened

Rewards are expected on the unit scale [0, 1] (Gaussian Thompson sampling also
works on any scale if you set its prior and noise to match).
"""

from __future__ import annotations

import math
from abc import ABC, abstractmethod

import numpy as np


class Agent(ABC):
    name = "agent"

    def __init__(self, n_arms: int, seed: int | None = None):
        if n_arms < 2:
            raise ValueError("a bandit needs at least two arms")
        self.n_arms = n_arms
        self.seed = seed
        self.reset()

    def reset(self) -> None:
        self.rng = np.random.default_rng(self.seed)
        self.counts = np.zeros(self.n_arms, dtype=np.int64)  # n_a
        self.sums = np.zeros(self.n_arms, dtype=float)  # Σ rewards from arm a
        self.t = 0  # number of completed pulls

    @property
    def estimates(self) -> np.ndarray:
        """Q̂_a, the empirical mean reward of each arm (0 for arms never pulled)."""
        return np.divide(self.sums, self.counts, out=np.zeros(self.n_arms), where=self.counts > 0)

    def _argmax(self, scores: np.ndarray) -> int:
        """argmax with ties broken uniformly at random."""
        best = np.flatnonzero(scores == scores.max())
        return int(best[0] if best.size == 1 else self.rng.choice(best))

    @abstractmethod
    def select(self) -> int: ...

    def update(self, arm: int, reward: float) -> None:
        self.counts[arm] += 1
        self.sums[arm] += reward
        self.t += 1


class EpsilonGreedy(Agent):
    """With probability ε pull a random arm, otherwise the arm with the best average.

    decay=None keeps ε constant (linear regret). decay=k shrinks it as
    ε_t = ε · k / (k + t), which spends a bounded-ish budget on exploration.
    """

    name = "ε-greedy"

    def __init__(self, n_arms: int, epsilon: float = 0.1, decay: float | None = None, seed: int | None = None):
        if not 0.0 <= epsilon <= 1.0:
            raise ValueError("epsilon must be in [0, 1]")
        self.epsilon = epsilon
        self.decay = decay
        self.last_explored = False
        super().__init__(n_arms, seed)

    def current_epsilon(self) -> float:
        if self.decay is None:
            return self.epsilon
        return self.epsilon * self.decay / (self.decay + self.t + 1)

    def select(self) -> int:
        if self.rng.random() < self.current_epsilon():
            self.last_explored = True
            return int(self.rng.integers(self.n_arms))
        self.last_explored = False
        return self._argmax(self.estimates)


class UCB1(Agent):
    """Optimism in the face of uncertainty (Auer et al., 2002).

    Pull every arm once, then pull argmax_a  Q̂_a + c·√(ln t / n_a).
    c = √2 is the classic choice for rewards in [0, 1].
    """

    name = "UCB1"

    def __init__(self, n_arms: int, c: float = math.sqrt(2), seed: int | None = None):
        self.c = c
        super().__init__(n_arms, seed)

    def upper_bounds(self) -> np.ndarray:
        t = self.t + 1
        bounds = np.full(self.n_arms, np.inf)
        pulled = self.counts > 0
        bounds[pulled] = self.estimates[pulled] + self.c * np.sqrt(math.log(t) / self.counts[pulled])
        return bounds

    def select(self) -> int:
        return self._argmax(self.upper_bounds())


class BernoulliThompson(Agent):
    """Thompson sampling for 0/1 rewards with a Beta(α, β) prior on each arm.

    Draw θ_a ~ Beta(α + wins_a, β + losses_a) and pull the arm with the highest draw.
    """

    name = "Thompson sampling"

    def __init__(self, n_arms: int, alpha: float = 1.0, beta: float = 1.0, seed: int | None = None):
        self.alpha, self.beta = alpha, beta
        super().__init__(n_arms, seed)

    def posterior(self) -> tuple[np.ndarray, np.ndarray]:
        return self.alpha + self.sums, self.beta + self.counts - self.sums

    def select(self) -> int:
        a, b = self.posterior()
        return self._argmax(self.rng.beta(a, b))


class GaussianThompson(Agent):
    """Thompson sampling with a Normal prior and known Gaussian noise.

    Prior μ_a ~ N(m₀, τ₀²); rewards ~ N(μ_a, σ²). After n_a pulls summing to S_a
    the posterior is Normal with

        precision = 1/τ₀² + n_a/σ²
        mean      = (m₀/τ₀² + S_a/σ²) / precision

    Draw one sample per arm and pull the highest.
    """

    name = "Thompson sampling"

    def __init__(
        self,
        n_arms: int,
        prior_mean: float = 0.5,
        prior_std: float = 0.25,
        noise_std: float = 0.2,
        seed: int | None = None,
    ):
        self.prior_mean, self.prior_std, self.noise_std = prior_mean, prior_std, noise_std
        super().__init__(n_arms, seed)

    def posterior(self) -> tuple[np.ndarray, np.ndarray]:
        precision = 1 / self.prior_std**2 + self.counts / self.noise_std**2
        mean = (self.prior_mean / self.prior_std**2 + self.sums / self.noise_std**2) / precision
        return mean, 1 / np.sqrt(precision)

    def select(self) -> int:
        mean, std = self.posterior()
        return self._argmax(self.rng.normal(mean, std))
