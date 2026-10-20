import numpy as np
import pytest

from bandits import UCB1, BernoulliThompson, EpsilonGreedy, GaussianThompson


def test_epsilon_validation():
    with pytest.raises(ValueError):
        EpsilonGreedy(3, epsilon=1.5)


def test_greedy_with_zero_epsilon_exploits():
    agent = EpsilonGreedy(4, epsilon=0.0, seed=0)
    agent.update(2, 1.0)
    assert all(agent.select() == 2 for _ in range(50))


def test_full_epsilon_is_uniform():
    agent = EpsilonGreedy(4, epsilon=1.0, seed=0)
    agent.update(0, 1.0)
    counts = np.bincount([agent.select() for _ in range(4000)], minlength=4)
    assert counts.min() > 850  # ≈1000 each


def test_decaying_epsilon_shrinks():
    agent = EpsilonGreedy(3, epsilon=0.5, decay=10, seed=0)
    start = agent.current_epsilon()
    for _ in range(100):
        agent.update(0, 0.0)
    assert agent.current_epsilon() < start / 5


def test_ucb_tries_every_arm_first():
    agent = UCB1(6, seed=1)
    seen = set()
    for _ in range(6):
        arm = agent.select()
        seen.add(arm)
        agent.update(arm, 0.5)
    assert seen == set(range(6))


def test_ucb_bonus_shrinks_with_pulls():
    agent = UCB1(2, seed=0)
    for arm in (0, 1):
        agent.update(arm, 0.5)
    for _ in range(50):
        agent.update(0, 0.5)
    bonus = agent.upper_bounds() - agent.estimates
    assert bonus[0] < bonus[1]


def test_bernoulli_thompson_posterior_counts():
    agent = BernoulliThompson(2)
    for r in (1, 1, 0):
        agent.update(0, r)
    a, b = agent.posterior()
    assert a[0] == 3 and b[0] == 2 and a[1] == 1 and b[1] == 1


def test_gaussian_thompson_posterior_concentrates_on_truth():
    agent = GaussianThompson(1 + 1, prior_mean=0.5, prior_std=0.25, noise_std=0.2, seed=0)
    rng = np.random.default_rng(0)
    for _ in range(400):
        agent.update(0, 0.8 + 0.2 * rng.standard_normal())
    mean, std = agent.posterior()
    assert abs(mean[0] - 0.8) < 0.03 and std[0] < 0.02 and std[1] == pytest.approx(0.25)


@pytest.mark.parametrize("cls", [lambda s: EpsilonGreedy(5, seed=s), lambda s: UCB1(5, seed=s), lambda s: GaussianThompson(5, seed=s)])
def test_agents_are_deterministic_given_seed(cls):
    def play(seed):
        agent, out = cls(seed), []
        for i in range(40):
            arm = agent.select()
            agent.update(arm, (i * 7 % 5) / 5)
            out.append(arm)
        return out

    assert play(3) == play(3)
