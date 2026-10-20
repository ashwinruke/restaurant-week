import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import notebookSource from "../../../bandits/notebooks/regret_analysis.ipynb?raw";
import { useGame } from "../store/game";
import { Button } from "../components/ui";

/** The runnable copy built by scripts/build_lab.py (JupyterLite, Python in the browser). */
const LAB_URL = "./lab/notebooks/index.html?path=regret_analysis.ipynb";

type Text = string | string[];
type Output =
  | { output_type: "stream"; name?: string; text: Text }
  | { output_type: "display_data" | "execute_result"; data: Record<string, Text> }
  | { output_type: "error"; ename: string; evalue: string };
interface Cell {
  cell_type: "markdown" | "code" | "raw";
  source: Text;
  outputs?: Output[];
  execution_count?: number | null;
}

const join = (t: Text) => (Array.isArray(t) ? t.join("") : t);
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const CODE_FONT = { fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, "SFMono-Regular", Menlo, monospace' };

/** Jupyter shows a line like `$$ … $$` as centred display maths; remark-math needs the $$ on their own lines for that. */
const displayMath = (md: string) => md.replace(/^\$\$(.+?)\$\$\s*$/gm, (_, tex: string) => `$$\n${tex.trim()}\n$$`);

/** Markdown cells: pixel headings, readable body, KaTeX math. */
function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // Pixelify Sans here: the heading pixel font has no Greek letters (ε).
        h1: ({ children }) => (
          <h2 className="text-3xl font-bold leading-tight md:text-5xl" style={{ textShadow: "3px 3px 0 rgb(var(--star))" }}>
            {children}
          </h2>
        ),
        h2: ({ children }) => <h2 className="font-display text-sm uppercase leading-relaxed md:text-base">{children}</h2>,
        h3: ({ children }) => <h3 className="font-display text-xs uppercase leading-relaxed">{children}</h3>,
        p: ({ children }) => <p className="max-w-3xl text-lg leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="pixel-list grid max-w-3xl gap-2 text-lg">{children}</ul>,
        ol: ({ children }) => <ol className="grid max-w-3xl list-decimal gap-2 pl-7 text-lg marker:font-mono marker:text-[11px] marker:text-gold">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        code: ({ children }) => (
          <code className="bg-sunk px-1.5 py-0.5 text-[0.9em]" style={CODE_FONT}>
            {children}
          </code>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-uday underline decoration-2 underline-offset-4">
            {children}
          </a>
        ),
      }}
    >
      {displayMath(text)}
    </ReactMarkdown>
  );
}

function CodeCell({ cell, open, onToggle }: { cell: Cell; open: boolean; onToggle: () => void }) {
  const code = join(cell.source);
  const lines = code.split("\n").length;
  return (
    <div className="grid gap-3">
      <div className="px-inset grid">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex items-center justify-between gap-3 px-3 py-2 text-left">
          <span className="font-mono text-[9px] uppercase text-muted">
            In [{cell.execution_count ?? " "}] · {open ? "▼ Hide" : "▶ Show"} code · {lines} lines
          </span>
        </button>
        {open && (
          <pre className="overflow-x-auto border-t-4 border-line bg-surface px-4 py-3 text-[13.5px] leading-relaxed" style={CODE_FONT}>
            <code style={CODE_FONT}>{code}</code>
          </pre>
        )}
      </div>
      {(cell.outputs ?? []).map((o, i) => (
        <OutputView key={i} output={o} />
      ))}
    </div>
  );
}

function OutputView({ output }: { output: Output }) {
  if (output.output_type === "stream") {
    return (
      <pre className="overflow-x-auto border-l-4 border-good bg-surface px-4 py-3 text-[13.5px] leading-relaxed" style={CODE_FONT}>
        {join(output.text)}
      </pre>
    );
  }
  if (output.output_type === "error") {
    return (
      <pre className="overflow-x-auto border-l-4 border-accent bg-surface px-4 py-3 text-[13.5px]" style={CODE_FONT}>
        {output.ename}: {output.evalue}
      </pre>
    );
  }
  const png = output.data["image/png"];
  if (png) {
    return (
      <figure className="px-panel w-fit max-w-full bg-white p-2">
        <img src={`data:image/png;base64,${join(png).replace(/\n/g, "")}`} alt="Plot from the notebook" className="block h-auto max-w-full" />
      </figure>
    );
  }
  const text = output.data["text/plain"];
  return text ? (
    <pre className="overflow-x-auto bg-surface px-4 py-3 text-[13.5px]" style={CODE_FONT}>
      {join(text)}
    </pre>
  ) : null;
}

function Section({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-6 gap-5">
      {children}
    </section>
  );
}

export default function Notebook() {
  const { go } = useGame();
  const cells = useMemo(() => (JSON.parse(notebookSource) as { cells: Cell[] }).cells, []);
  const [openAll, setOpenAll] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [labReady, setLabReady] = useState(false);

  // The runnable copy only exists on the deployed site (or after scripts/build_lab.py), so check before linking.
  useEffect(() => {
    let alive = true;
    fetch("./lab/jupyter-lite.json", { cache: "no-store" })
      .then((r) => alive && setLabReady(r.ok && (r.headers.get("content-type") ?? "").includes("json")))
      .catch(() => alive && setLabReady(false));
    return () => {
      alive = false;
    };
  }, []);

  const toc = cells
    .map((c, i) => ({ i, m: c.cell_type === "markdown" ? /^##\s+(.+)$/m.exec(join(c.source)) : null }))
    .filter((x): x is { i: number; m: RegExpExecArray } => x.m != null)
    .map(({ i, m }) => ({ i, title: m[1], id: slug(m[1]) }));

  const download = () => {
    const url = URL.createObjectURL(new Blob([notebookSource], { type: "application/x-ipynb+json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "regret_analysis.ipynb";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-10 py-8">
      <header className="px-panel grid gap-5 p-5 md:p-8">
        <p className="eyebrow">Bonus level · the full analysis</p>
        <p className="max-w-3xl text-lg">
          This is the Jupyter notebook behind the game: the theory, the code and the experiments that compare ε-greedy, UCB1 and Thompson sampling on many neighbourhoods. Read it
          here, or run it yourself.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {labReady ? (
            <a href={LAB_URL} target="_blank" rel="noreferrer" className="px-btn bg-accent text-white">
              ▶ Run it in your browser
            </a>
          ) : (
            <span className="px-btn cursor-not-allowed bg-sunk text-muted" title="Built for the deployed site">
              ▶ Run it in your browser
            </span>
          )}
          <Button variant="ghost" onClick={download}>
            ⬇ Download .ipynb
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen({});
              setOpenAll((v) => !v);
            }}
          >
            {openAll ? "Hide all code" : "Show all code"}
          </Button>
        </div>
        <p className="text-muted">
          {labReady
            ? "Opens JupyterLite: real Jupyter with Python running in your browser, nothing to install. In the browser the experiments average fewer runs, so they finish in a minute or two."
            : "The runnable version is built next to the game when it is deployed. Locally, run scripts/build_lab.py after npm run build, then npm run preview."}
        </p>
        {toc.length > 0 && (
          <nav aria-label="Sections" className="flex flex-wrap gap-2 border-t-4 border-line pt-4">
            {toc.map((t) => (
              <button key={t.id} type="button" onClick={() => document.getElementById(t.id)?.scrollIntoView({ behavior: "smooth" })} className="px-tag text-ink hover:bg-star">
                {t.title}
              </button>
            ))}
          </nav>
        )}
      </header>

      {cells.map((cell, i) => {
        if (cell.cell_type === "markdown") {
          const text = join(cell.source);
          const h = toc.find((t) => t.i === i);
          return (
            <Section key={i} id={h?.id}>
              <Markdown text={text} />
            </Section>
          );
        }
        if (cell.cell_type === "code") {
          return (
            <CodeCell
              key={i}
              cell={cell}
              open={open[i] ?? openAll}
              onToggle={() => setOpen((o) => ({ ...o, [i]: !(o[i] ?? openAll) }))}
            />
          );
        }
        return null;
      })}

      <div className="flex flex-wrap gap-4 border-t-4 border-line pt-6">
        <Button variant="gold" onClick={() => go("lab")}>
          Try it live in the lab ▶
        </Button>
        <Button variant="ghost" onClick={() => go("intro")}>
          Play a week
        </Button>
      </div>
    </div>
  );
}
