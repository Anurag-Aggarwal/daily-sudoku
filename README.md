# Sudoku

A daily little ritual — a clean, minimal Sudoku game built with plain HTML, CSS, and JavaScript. No frameworks, no build step.

Every puzzle is generated on the fly and guaranteed to have exactly one solution.

![Sudoku screenshot](docs/screenshot.png)

## Features

- **Dynamic puzzle generation** with Easy / Medium / Hard difficulty, each guaranteed a unique solution
- **Fully fluid, responsive layout** — two columns (board + controls) on desktop, controls reflow below the board on narrow screens; the grid always stays a perfect square and scales to fit any viewport, no horizontal scrolling
- **Keyboard play** — arrow keys to move, 1–9 to fill, Backspace/Delete to erase, Escape to deselect, `N` to toggle pencil marks
- **Pencil marks (notes) mode** for jotting down candidate numbers in a cell
- **Selection highlighting** — the selected cell, its row/column/box, and matching numbers are all highlighted
- **Mistake tracking** (0/3) with a visual conflict flash on wrong entries
- **Hints** that reveal a logically justified next move (naked single, hidden single, or a verified reveal as a last resort)
- **Live timer** and a subtle win state when the puzzle is solved
- **Accessible by design** — ARIA grid semantics, roving tabindex/focus management, and WCAG AA-contrast text colors

## Running it locally

This is a static site — no build tools or dependencies required.

1. Clone the repo:
   ```bash
   git clone https://github.com/<your-username>/daily-sudoku.git
   cd daily-sudoku
   ```
2. Open `index.html` directly in a browser, **or** serve it locally (recommended, avoids any `file://` quirks):
   ```bash
   python -m http.server 8000
   # then visit http://localhost:8000
   ```

## Tech

Plain HTML, CSS, and JavaScript — CSS Grid/Flexbox, `aspect-ratio`, `clamp()`/`min()`, container queries, and `dvh` units for the fluid layout; no frameworks or dependencies.
