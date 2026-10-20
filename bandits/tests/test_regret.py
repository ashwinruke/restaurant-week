"""Statistical checks on the behaviour the theory predicts."""

import numpy as np
import pytest

from bandits import (
    UCB1,
    BernoulliBandit,
    BernoulliThompson,
    EpsilonGreedy,
    GaussianThompson,
    StarRatingBandit,
    lai_robbins_bound,
    random_neighbourhood,
    run_episode,
    run_experiment,
)

MEANS = [0.2, 0.35, 0.5, 0.55, 0.7]


def bernoulli_env(seed):
    return BernoulliBandit(MEANS, seed=seed)


@pytest.fixture(scope="module")
def long_run():
    agents = {
        "eps": lambda k, s: EpsilonGreedy(k, epsilon=0.1, seed=s),
        "ucb": lambda k, s: UCB1(k, seed=s),
        "ts": lambda k, s: BernoulliThompson(k, seed=s),
    }
    return run_experiment(agents, bernoulli_env, horizon=3000, runs=40, seed=11)


def test_regret_is_non_negative_and_non_decreasing():
    ep = run_episode(UCB1(5, seed=0), bernoulli_env(0), 500)
    cum = ep.cumulative_regret
    assert cum[0] >= 0 and np.all(np.diff(cum) >= 0)


def test_ucb_and_thompson_regret_is_sublinear(long_run):
    for name in ("ucb", "ts"):
        m = long_run[name].mean
        # Linear regret would grow 10× when the horizon grows 10×; logarithmic growth stays far below that.
        assert m[2999] < 5 * m[299], name


def test_constant_epsilon_regret_is_linear(long_run):
    m = long_run["eps"].mean
    late_slope = (m[2999] - m[1999]) / 1000
    expected = 0.1 * np.mean(0.7 - np.array(MEANS))  # ε × average gap of a random pull
    assert late_slope == pytest.approx(expected, rel=0.35)


def test_thompson_beats_constant_epsilon_in_the_long_run(long_run):
    assert long_run["ts"].final_regret < long_run["eps"].final_regret


def test_everyone_finds_the_best_arm_eventually(long_run):
    for name, res in long_run.items():
        assert res.optimal_rate[-300:].mean() > 0.6, name


def test_common_random_numbers_make_identical_agents_identical():
    agents = {"a": lambda k, s: UCB1(k, seed=0), "b": lambda k, s: UCB1(k, seed=0)}
    res = run_experiment(agents, bernoulli_env, horizon=200, runs=5, seed=2)
    assert np.array_equal(res["a"].cumulative_regret, res["b"].cumulative_regret)


def test_restaurant_week_setting_runs():
    def env(seed):
        return StarRatingBandit(random_neighbourhood(8, seed), seed=seed)

    res = run_experiment({"ts": lambda k, s: GaussianThompson(k, seed=s)}, env, horizon=200, runs=10)
    assert res["ts"].cumulative_regret.shape == (10, 200)
    assert res["ts"].optimal_rate[-50:].mean() > 0.5


def test_lai_robbins_bound():
    assert lai_robbins_bound([0.5, 0.5]) == 0
    assert lai_robbins_bound(MEANS) > 0
    assert lai_robbins_bound([0.0, 1.0], sigma=1.0) == pytest.approx(2.0)
