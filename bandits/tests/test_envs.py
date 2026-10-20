import numpy as np
import pytest

from bandits import BernoulliBandit, GaussianBandit, StarRatingBandit, random_neighbourhood


def test_same_seed_gives_same_reward_streams():
    a = GaussianBandit([0.0, 1.0, 2.0], seed=42)
    b = GaussianBandit([0.0, 1.0, 2.0], seed=42)
    # Pull arms in different orders: the n-th pull of each arm must still match.
    ra = [a.pull(0), a.pull(0), a.pull(2)]
    rb = [b.pull(2), b.pull(0), b.pull(0)]
    assert ra[0] == rb[1] and ra[1] == rb[2] and ra[2] == rb[0]


def test_reset_restarts_streams():
    env = BernoulliBandit([0.3, 0.7], seed=1)
    first = [env.pull(1) for _ in range(20)]
    env.reset(1)
    assert first == [env.pull(1) for _ in range(20)]


def test_bernoulli_rejects_bad_means():
    with pytest.raises(ValueError):
        BernoulliBandit([0.2, 1.4])


def test_bernoulli_rates_match_means():
    env = BernoulliBandit([0.1, 0.8], seed=3)
    assert abs(np.mean([env.pull(1) for _ in range(5000)]) - 0.8) < 0.03


def test_star_ratings_are_half_steps_between_1_and_5():
    env = StarRatingBandit([1.2, 4.9], sigma=1.5, seed=7)
    ratings = np.array([env.pull(a) for a in (0, 1) for _ in range(500)])
    assert ratings.min() >= 1 and ratings.max() <= 5
    assert np.allclose(ratings * 2, np.round(ratings * 2))
    assert env.to_unit(1.0) == 0.0 and env.to_unit(5.0) == 1.0


def test_gaps_and_optimal_arms():
    env = GaussianBandit([0.2, 0.9, 0.5])
    assert np.allclose(env.gaps, [0.7, 0.0, 0.4])
    assert list(env.optimal_arms) == [1]


def test_random_neighbourhood_has_one_standout():
    means = random_neighbourhood(8, seed=0)
    s = np.sort(means)[::-1]
    assert len(means) == 8 and 4.2 <= s[0] <= 4.6 and 0.3 <= s[0] - s[1] <= 0.6 + 1e-9
