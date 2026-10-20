"""Multi-armed bandits: ε-greedy, UCB1 and Thompson sampling, plus tools to compare their regret."""

from .agents import Agent, BernoulliThompson, EpsilonGreedy, GaussianThompson, UCB1
from .envs import BanditEnv, BernoulliBandit, GaussianBandit, StarRatingBandit, random_neighbourhood
from .simulate import EpisodeResult, ExperimentResult, lai_robbins_bound, run_episode, run_experiment

__all__ = [
    "Agent",
    "EpsilonGreedy",
    "UCB1",
    "BernoulliThompson",
    "GaussianThompson",
    "BanditEnv",
    "BernoulliBandit",
    "GaussianBandit",
    "StarRatingBandit",
    "random_neighbourhood",
    "EpisodeResult",
    "ExperimentResult",
    "run_episode",
    "run_experiment",
    "lai_robbins_bound",
]

__version__ = "0.1.0"
