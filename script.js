const DIFFICULTIES = {
  easy: { clues: 42, label: 'Easy' },
  medium: { clues: 34, label: 'Medium' },
  hard: { clues: 28, label: 'Hard' }
};

let game;
let selected = null;
let notesMode = false;
let seconds = 0;
let timerId;
let cellEls = [];

const board = document.querySelector('#board');
const message = document.querySelector('#message');
const difficulty = document.querySelector('#difficulty');
const timer = document.querySelector('#timer');
const mistakes = document.querySelector('#mistakes');
const notesToggle = document.querySelector('#notes-toggle');
const notesToggleState = notesToggle.querySelector('.notes-toggle-state');

const range = n => Array.from({ length: n }, (_, i) => i);
const shuffle = values => {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const rowOf = index => Math.floor(index / 9);
const colOf = index => index % 9;

// ---- Puzzle generation (unchanged core algorithm) ----

function createSolution() {
  const pattern = (row, col) => (row * 3 + Math.floor(row / 3) + col) % 9;
  const reorder = () => shuffle(range(3)).flatMap(band => shuffle(range(3)).map(row => band * 3 + row));
  const rows = reorder();
  const cols = reorder();
  const numbers = shuffle(range(9).map(n => n + 1));
  return rows.flatMap(row => cols.map(col => numbers[pattern(row, col)]));
}

function candidates(grid, index) {
  if (grid[index]) return [];
  const row = rowOf(index);
  const col = colOf(index);
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const used = new Set();
  for (let i = 0; i < 9; i++) {
    used.add(grid[row * 9 + i]);
    used.add(grid[i * 9 + col]);
    used.add(grid[(boxRow + Math.floor(i / 3)) * 9 + boxCol + (i % 3)]);
  }
  return range(9).map(n => n + 1).filter(n => !used.has(n));
}

function countSolutions(grid, limit = 2) {
  let bestIndex = -1;
  let bestCandidates = null;
  for (let index = 0; index < 81; index++) {
    if (grid[index]) continue;
    const options = candidates(grid, index);
    if (options.length === 0) return 0;
    if (!bestCandidates || options.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = options;
      if (options.length === 1) break;
    }
  }
  if (bestIndex === -1) return 1;
  let total = 0;
  for (const value of bestCandidates) {
    grid[bestIndex] = value;
    total += countSolutions(grid, limit - total);
    grid[bestIndex] = 0;
    if (total >= limit) return total;
  }
  return total;
}

function generatePuzzle(targetClues) {
  let best = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const solution = createSolution();
    const puzzle = [...solution];
    let clues = 81;
    for (const index of shuffle(range(81))) {
      if (clues <= targetClues) break;
      const saved = puzzle[index];
      puzzle[index] = 0;
      if (countSolutions(puzzle, 2) === 1) clues--;
      else puzzle[index] = saved;
    }
    if (!best || clues < best.clues) best = { puzzle, solution, clues };
    if (clues <= targetClues) return best;
  }
  return best;
}

// ---- Timer ----

function startTimer() {
  clearInterval(timerId);
  seconds = 0;
  timer.textContent = '00:00';
  timerId = setInterval(() => {
    seconds++;
    timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }, 1000);
}

// ---- Game lifecycle ----

function startGame() {
  const setting = DIFFICULTIES[difficulty.value];
  message.textContent = `Generating a unique ${setting.label.toLowerCase()} puzzle...`;
  requestAnimationFrame(() => {
    const generated = generatePuzzle(setting.clues);
    game = {
      puzzle: generated.puzzle,
      solution: generated.solution,
      grid: [...generated.puzzle],
      notes: Array.from({ length: 81 }, () => new Set()),
      mistakes: 0,
      complete: false
    };
    selected = null;
    setNotesMode(false);
    startTimer();
    message.textContent = `${setting.label} puzzle ready. Every puzzle has exactly one solution.`;
    render();
  });
}

function isPeer(a, b) {
  const row = rowOf(a), col = colOf(a);
  return rowOf(b) === row || colOf(b) === col ||
    (Math.floor(rowOf(b) / 3) === Math.floor(row / 3) && Math.floor(colOf(b) / 3) === Math.floor(col / 3));
}

// ---- Rendering ----

function renderNotes(noteSet) {
  const grid = document.createElement('span');
  grid.className = 'notes';
  grid.setAttribute('aria-hidden', 'true');
  for (let n = 1; n <= 9; n++) {
    const mark = document.createElement('span');
    mark.textContent = noteSet.has(n) ? String(n) : '';
    grid.append(mark);
  }
  return grid;
}

function render(focusSelected = false) {
  board.innerHTML = '';
  cellEls = [];
  const activeIndex = selected ?? 0;

  range(9).forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'board-row';
    rowEl.setAttribute('role', 'row');
    rowEl.setAttribute('aria-rowindex', String(row + 1));

    range(9).forEach(col => {
      const index = row * 9 + col;
      const value = game.grid[index];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-colindex', String(col + 1));
      cell.tabIndex = index === activeIndex ? 0 : -1;

      const isGiven = Boolean(game.puzzle[index]);
      if (isGiven) cell.classList.add('given');
      if (selected !== null && isPeer(selected, index)) cell.classList.add('related');
      if (index === selected) {
        cell.classList.add('selected');
        cell.setAttribute('aria-selected', 'true');
      }
      if (selected !== null && value && value === game.grid[selected]) cell.classList.add('same-number');

      if (value) {
        cell.textContent = value;
        cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, ${isGiven ? 'given' : 'entered'} ${value}`);
      } else if (game.notes[index].size) {
        cell.append(renderNotes(game.notes[index]));
        cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, empty, notes ${[...game.notes[index]].sort().join(', ')}`);
      } else {
        cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, empty`);
      }

      cell.addEventListener('click', () => select(index));
      cellEls.push(cell);
      rowEl.append(cell);
    });

    board.append(rowEl);
  });

  board.classList.toggle('complete', game.complete);
  mistakes.textContent = `${game.mistakes} / 3`;

  if (focusSelected && selected !== null) cellEls[selected].focus();
}

// ---- Selection & notes mode ----

function select(index) {
  if (!game || game.complete) return;
  selected = index;
  message.textContent = game.puzzle[index] ? 'Given square selected.' : 'Use the number pad or your keyboard.';
  render(true);
}

function moveSelection(deltaRow, deltaCol) {
  if (!game || game.complete) return;
  const base = selected ?? 0;
  const row = Math.min(8, Math.max(0, rowOf(base) + deltaRow));
  const col = Math.min(8, Math.max(0, colOf(base) + deltaCol));
  selected = row * 9 + col;
  render(true);
}

function setNotesMode(active) {
  notesMode = active;
  notesToggle.setAttribute('aria-pressed', String(active));
  notesToggle.classList.toggle('active', active);
  notesToggleState.textContent = active ? 'on' : 'off';
}

// ---- Gameplay ----

function flashConflict(index) {
  const cell = cellEls[index];
  if (!cell) return;
  cell.classList.add('conflict');
  setTimeout(() => cell.classList.remove('conflict'), 500);
}

function finishIfComplete() {
  if (game.grid.every((value, index) => value === game.solution[index])) {
    game.complete = true;
    clearInterval(timerId);
    message.textContent = `Puzzle complete in ${timer.textContent}. Beautiful work.`;
  }
}

function input(value) {
  if (!game || game.complete) return;
  if (selected === null || game.puzzle[selected]) {
    message.textContent = 'Select an empty square first.';
    return;
  }

  if (value === 0) {
    if (game.grid[selected]) {
      game.grid[selected] = 0;
      message.textContent = 'Square cleared.';
    } else if (game.notes[selected].size) {
      game.notes[selected].clear();
      message.textContent = 'Notes cleared.';
    } else {
      message.textContent = 'Nothing to clear.';
    }
    render();
    return;
  }

  if (notesMode) {
    if (game.grid[selected]) {
      message.textContent = 'Clear the digit before adding notes.';
      return;
    }
    const notes = game.notes[selected];
    if (notes.has(value)) notes.delete(value);
    else notes.add(value);
    render();
    return;
  }

  if (game.grid[selected] === value) return;

  const legalNow = candidates(game.grid, selected).includes(value);
  if (value !== game.solution[selected]) {
    game.mistakes++;
    message.textContent = legalNow ? 'That leads away from this puzzle’s unique solution.' : 'That conflicts with a row, column, or box.';
    if (game.mistakes >= 3) {
      message.textContent = 'Three mistakes - generating a fresh puzzle.';
      render();
      flashConflict(selected);
      setTimeout(startGame, 850);
      return;
    }
    render();
    flashConflict(selected);
    return;
  }

  game.grid[selected] = value;
  game.notes[selected].clear();
  message.textContent = 'Nice placement.';
  finishIfComplete();
  render();
}

function findHint() {
  for (let index = 0; index < 81; index++) {
    const options = candidates(game.grid, index);
    if (options.length === 1) return { index, value: options[0], reason: 'Naked single' };
  }
  const units = [
    ...range(9).map(row => range(9).map(col => row * 9 + col)),
    ...range(9).map(col => range(9).map(row => row * 9 + col)),
    ...range(3).flatMap(boxRow => range(3).map(boxCol => range(9).map(i => (boxRow * 3 + Math.floor(i / 3)) * 9 + boxCol * 3 + (i % 3))))
  ];
  for (const unit of units) {
    const locations = new Map();
    for (const index of unit) for (const value of candidates(game.grid, index)) {
      locations.set(value, [...(locations.get(value) || []), index]);
    }
    for (const [value, indexes] of locations) if (indexes.length === 1) return { index: indexes[0], value, reason: 'Hidden single' };
  }
  const open = range(81).filter(index => !game.grid[index]);
  if (!open.length) return null;
  const index = selected !== null && !game.grid[selected] ? selected : open[Math.floor(Math.random() * open.length)];
  return { index, value: game.solution[index], reason: 'Verified reveal' };
}

function giveHint() {
  if (!game || game.complete) return;
  const hint = findHint();
  if (!hint) return;
  game.grid[hint.index] = hint.value;
  game.notes[hint.index].clear();
  selected = hint.index;
  message.textContent = `${hint.reason}: row ${rowOf(hint.index) + 1}, column ${colOf(hint.index) + 1} is ${hint.value}.`;
  finishIfComplete();
  render(true);
}

// ---- Controls ----

document.querySelectorAll('[data-number]').forEach(button => button.addEventListener('click', () => input(Number(button.dataset.number))));
document.querySelector('#erase').addEventListener('click', () => input(0));
document.querySelector('#hint').addEventListener('click', giveHint);
document.querySelector('#new-game').addEventListener('click', startGame);
notesToggle.addEventListener('click', () => setNotesMode(!notesMode));
difficulty.addEventListener('change', startGame);

const ARROW_DELTAS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.tagName === 'SELECT') return;

  if (ARROW_DELTAS[event.key]) {
    event.preventDefault();
    moveSelection(...ARROW_DELTAS[event.key]);
    return;
  }
  if (/^[1-9]$/.test(event.key)) { input(Number(event.key)); return; }
  if (event.key === 'Backspace' || event.key === 'Delete') { input(0); return; }
  if (event.key === 'Escape') { selected = null; render(); return; }
  if (event.key.toLowerCase() === 'n') { setNotesMode(!notesMode); }
});

startGame();
