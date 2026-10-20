"""Build the runnable notebook into game/dist/lab, next to the built game.

JupyterLite runs Jupyter entirely in the visitor's browser (Python via Pyodide), so the
notebook works on GitHub Pages with no server. Run this after `npm run build`:

    pip install -r scripts/requirements-lab.txt
    python scripts/build_lab.py

The game's Notebook page links to dist/lab/notebooks/index.html?path=regret_analysis.ipynb.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = ROOT / "bandits" / "bandits"
NOTEBOOK = ROOT / "bandits" / "notebooks" / "regret_analysis.ipynb"
DIST = ROOT / "game" / "dist"
OUT = DIST / "lab"


def main() -> None:
    if not DIST.exists():
        sys.exit("game/dist not found. Run `npm run build` in game/ first.")

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        contents = work / "contents"
        contents.mkdir()
        # The notebook and the package sit side by side, so `import bandits` works in the browser.
        shutil.copytree(PACKAGE, contents / "bandits", ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        shutil.copy2(NOTEBOOK, contents / NOTEBOOK.name)

        if OUT.exists():
            shutil.rmtree(OUT)
        subprocess.run(
            # `-m jupyterlite_core` (not `-m jupyter lite`) so the build uses this Python and its installed kernel.
            [sys.executable, "-m", "jupyterlite_core", "build", "--contents", str(contents), "--output-dir", str(OUT)],
            cwd=work,
            check=True,
        )
    # Source maps are ~48 MB and only help when debugging JupyterLite itself.
    for source_map in OUT.rglob("*.map"):
        source_map.unlink()
    print(f"JupyterLite built in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
