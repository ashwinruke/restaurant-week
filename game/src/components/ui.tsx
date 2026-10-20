import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { monogram, PLAYER_META, type PlayerId } from "../game/data";

/** Draws a bitmap from rows of characters; each character maps to a colour in `palette` ('.' = transparent). */
function Bitmap({ rows, palette, scale }: { rows: string[]; palette: Record<string, string>; scale: number }) {
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true" className="shrink-0">
      {rows.flatMap((r, y) =>
        [...r].map((ch, x) => (palette[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ch]} /> : null)),
      )}
    </svg>
  );
}

const STAR = ["....#....", "....#....", "...###...", "#########", ".#######.", "..#####..", "..##.##..", ".##...##.", ".#.....#."];
const steps4 = (t: number) => Math.floor(t * 4) / 4;

/** Five pixel stars; partial stars fill column by column (half stars show half the sprite). */
export function Stars({ value, size = 18, pop = false }: { value: number; size?: number; pop?: boolean }) {
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`${value} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i)) * 9;
        const star = (
          <svg width={size} height={size} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
            {STAR.flatMap((r, y) =>
              [...r].map((ch, x) =>
                ch === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={x + 0.5 <= fill ? "rgb(var(--star))" : "rgb(var(--line))"} /> : null,
              ),
            )}
          </svg>
        );
        return pop ? (
          <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.09 * i, duration: 0.2, ease: steps4 }}>
            {star}
          </motion.span>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </span>
  );
}

const HEART = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
const HEART_HI = [".##.##.", "#w#####", "#######", ".#####.", "..###..", "...#..."];

/** Health hearts: one per dinner, full = dinners still to eat. */
export function Hearts({ total, left }: { total: number; left: number }) {
  return (
    <span className="inline-flex max-w-[260px] flex-wrap gap-[4px]" role="img" aria-label={`${left} of ${total} dinners left`}>
      {Array.from({ length: total }, (_, i) => (
        <Bitmap
          key={i}
          rows={i < left ? HEART_HI : HEART}
          palette={i < left ? { "#": "rgb(var(--accent))", w: "#fff" } : { "#": "rgb(var(--line))" }}
          scale={3}
        />
      ))}
    </span>
  );
}

const COIN = ["..####..", ".#yyyy#.", "#yywyyy#", "#yywyyy#", "#yywyyy#", "#yywyyy#", ".#yyyy#.", "..####.."];

export function Coin({ scale = 3 }: { scale?: number }) {
  return <Bitmap rows={COIN} palette={{ "#": "#b86f0e", y: "rgb(var(--star))", w: "#fff" }} scale={scale} />;
}

/** Arcade coin counter: coin × value. */
export function CoinCounter({ value, label }: { value: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Coin />
      <span className="font-mono text-[10px] text-muted">×</span>
      <span className="num font-mono text-lg text-gold">{value}</span>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Chunky segmented loading bar. */
export function ChunkyBar({ value, max, segments = 20, color = "var(--good)" }: { value: number; max: number; segments?: number; color?: string }) {
  const filled = Math.round((Math.min(value, max) / max) * segments);
  return (
    <div className="flex gap-[3px] border-4 border-edge bg-sunk p-[3px]" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      {Array.from({ length: segments }, (_, i) => (
        <div key={i} className="h-4 flex-1" style={{ background: i < filled ? `rgb(${color})` : "rgb(var(--line) / 0.4)" }} />
      ))}
    </div>
  );
}

/** Restaurant sign: a square tile with its initials. */
export function Monogram({ name, hue, size = 40 }: { name: string; hue: number; size?: number }) {
  return (
    <span
      className="badge inline-flex shrink-0 items-center justify-center font-display"
      style={{ ["--h" as string]: hue, width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.26)) }}
      aria-hidden="true"
    >
      {monogram(name)}
    </span>
  );
}

const FACE = ["..####..", ".######.", "#kk##kk#", "#kk##kk#", "########", "#k####k#", "##kkkk##", ".######."];

/** Pixel sprite for a player, tinted in their colour. */
export function Avatar({ id, size = 32 }: { id: PlayerId; size?: number }) {
  const m = PLAYER_META[id];
  return <Bitmap rows={FACE} palette={{ "#": `rgb(var(--${m.color}))`, k: "#000" }} scale={Math.max(2, Math.round(size / 8))} />;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "gold";
  className?: string;
}) {
  const look = variant === "primary" ? "bg-accent text-white" : variant === "gold" ? "bg-star text-black" : "bg-surface text-ink";
  return (
    <button type="button" onClick={onClick} className={`px-btn ${look} ${className}`}>
      {children}
    </button>
  );
}

/** Resolved colours for charts (SVG attributes can't rely on CSS variables everywhere). */
export function useThemeColors() {
  const [colors] = useState(() => {
    const s = getComputedStyle(document.documentElement);
    const c = (n: string) => `rgb(${s.getPropertyValue(`--${n}`).trim().split(" ").join(",")})`;
    return { you: c("you"), eps: c("ekta"), ucb: c("uday"), ts: c("tara"), ink: c("ink"), muted: c("muted"), line: c("line"), surface: c("surface"), star: c("star"), gold: c("gold"), edge: c("edge") };
  });
  return colors;
}

export const PIXEL_FONT = '"Press Start 2P", monospace';
