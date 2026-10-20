import type { AgentId } from "../bandits";

export interface Place {
  name: string;
  cuisine: string;
  dish: string;
  hue: number;
}

/** The neighbourhood's possible restaurants. Each week picks 8 and secretly assigns their quality. */
export const PLACES: Place[] = [
  { name: "Bawarchi Biryani House", cuisine: "Hyderabadi", dish: "mutton dum biryani", hue: 28 },
  { name: "Annapoorna Tiffin Room", cuisine: "South Indian", dish: "ghee roast dosa", hue: 45 },
  { name: "Momo Junction", cuisine: "Tibetan", dish: "steamed chicken momos", hue: 200 },
  { name: "Sardarji Da Dhaba", cuisine: "Punjabi", dish: "dal makhani & lachha paratha", hue: 12 },
  { name: "Konkan Kinara", cuisine: "Malvani seafood", dish: "surmai thali", hue: 190 },
  { name: "Chaat Chowk", cuisine: "Street chaat", dish: "dahi puri", hue: 330 },
  { name: "Kolkata Kathi Co.", cuisine: "Bengali rolls", dish: "egg chicken kathi roll", hue: 18 },
  { name: "Irani Café Gulmohar", cuisine: "Irani café", dish: "bun maska & keema pav", hue: 35 },
  { name: "Thali Tales", cuisine: "Gujarati", dish: "unlimited thali", hue: 52 },
  { name: "Spice Route Kitchen", cuisine: "Kerala", dish: "appam & stew", hue: 140 },
  { name: "Wok This Way", cuisine: "Indo-Chinese", dish: "chilli paneer & hakka noodles", hue: 0 },
  { name: "Pav Bhaji Palace", cuisine: "Mumbai street food", dish: "butter pav bhaji", hue: 15 },
  { name: "Dilli Darbar", cuisine: "Mughlai", dish: "nihari & sheermal", hue: 300 },
  { name: "Udupi Prakash", cuisine: "Udupi", dish: "neer dosa & sagu", hue: 95 },
];

export const NEIGHBOURHOOD = "Gulmohar Colony";
export const N_PLACES = 8;
export const DINNERS = 20;

export function monogram(name: string) {
  const words = name.replace(/[^A-Za-z ]/g, "").split(" ").filter((w) => w.length > 2 || /^[A-Z]/.test(w));
  return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
}

export type PlayerId = "you" | AgentId;

export interface Friend {
  id: AgentId;
  name: string;
  algorithm: string;
  motto: string;
  explain: string;
  rule: string;
}

/** Each friend's initial matches their algorithm: Ekta = ε-greedy, Uday = UCB1, Tara = Thompson sampling. */
export const FRIENDS: Friend[] = [
  {
    id: "eps",
    name: "Ekta",
    algorithm: "ε-greedy",
    motto: "I go back to my favourite. But one night in ten, I pick a place at random.",
    explain:
      "Ekta mostly exploits: she eats wherever has the best average so far. A fixed share of nights (ε = 10%) she explores at random. Simple and robust, but those random nights never stop, even after she has found the best place, so her regret keeps growing in a straight line.",
    rule: "with prob. ε: random place · otherwise: argmax Q̂ₐ",
  },
  {
    id: "ucb",
    name: "Uday",
    algorithm: "UCB1",
    motto: "A place I've barely tried might be amazing. I give it the benefit of the doubt.",
    explain:
      "Uday is optimistic. He scores each place by its average plus a bonus that is big when he has few visits and shrinks as he learns. He tries every place once first, which leaves little time to cash in during a short week, but over hundreds of dinners his regret flattens out (it grows like log t).",
    rule: "argmax  Q̂ₐ + c·√(ln t / nₐ)",
  },
  {
    id: "ts",
    name: "Tara",
    algorithm: "Thompson sampling",
    motto: "I imagine how good each place could be tonight, given what I know, and follow my gut.",
    explain:
      "Tara keeps a belief (a probability distribution) about each kitchen's true quality. Each night she draws one plausible quality per place and goes to the highest draw. Places she is unsure about sometimes draw high, so she explores exactly as much as her uncertainty warrants. It is usually the strongest of the three.",
    rule: "θₐ ~ posterior(a) · go to argmax θₐ",
  },
];

export const PLAYER_META: Record<PlayerId, { name: string; tag: string; color: string; initial: string }> = {
  you: { name: "You", tag: "Your instincts", color: "you", initial: "Y" },
  eps: { name: "Ekta", tag: "ε-greedy", color: "ekta", initial: "E" },
  ucb: { name: "Uday", tag: "UCB1", color: "uday", initial: "U" },
  ts: { name: "Tara", tag: "Thompson sampling", color: "tara", initial: "T" },
};
