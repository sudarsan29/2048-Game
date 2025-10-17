import React, { useEffect, useState, useCallback } from 'react';

// --- Board utilities ---
const createEmptyBoard = (size) => Array.from({ length: size }, () => Array(size).fill(0));
const cloneBoard = (board) => board.map((row) => row.slice());
const getEmptyPositions = (board) => {
  const empty = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board.length; c++) {
      if (board[r][c] === 0) empty.push({ r, c });
    }
  }
  return empty;
};

const addRandomTile = (board) => {
  const empty = getEmptyPositions(board);
  if (empty.length === 0) return board;
  const idx = Math.floor(Math.random() * empty.length);
  const pos = empty[idx];
  const tile = Math.random() < 0.9 ? 2 : 4;
  const newBoard = cloneBoard(board);
  newBoard[pos.r][pos.c] = tile;
  return newBoard;
};

const compressRow = (row) => row.filter((v) => v !== 0);
const mergeRow = (row) => {
  const newRow = [];
  let score = 0;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === row[i + 1]) {
      const merged = row[i] * 2;
      newRow.push(merged);
      score += merged;
      i++;
    } else {
      newRow.push(row[i]);
    }
  }
  return { newRow, score };
};
const normalizeRow = (row, size) => {
  while (row.length < size) row.push(0);
  return row;
};

const moveLeftPure = (board) => {
  const size = board.length;
  let moved = false;
  let totalScore = 0;
  const newBoard = board.map((row) => {
    const compressed = compressRow(row);
    const { newRow, score } = mergeRow(compressed);
    const normalized = normalizeRow(newRow, size);
    if (!moved && normalized.some((v, i) => v !== row[i])) moved = true;
    totalScore += score;
    return normalized;
  });
  return { board: newBoard, moved, gainedScore: totalScore };
};

const transpose = (board) => {
  const size = board.length;
  const t = createEmptyBoard(size);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) t[c][r] = board[r][c];
  return t;
};
const reverseRows = (board) => board.map((row) => row.slice().reverse());

const moveRightPure = (board) => {
  const reversed = reverseRows(board);
  const { board: movedBoard, moved, gainedScore } = moveLeftPure(reversed);
  return { board: reverseRows(movedBoard), moved, gainedScore };
};
const moveUpPure = (board) => {
  const transposed = transpose(board);
  const { board: movedBoard, moved, gainedScore } = moveLeftPure(transposed);
  return { board: transpose(movedBoard), moved, gainedScore };
};
const moveDownPure = (board) => {
  const transposed = transpose(board);
  const { board: movedBoard, moved, gainedScore } = moveRightPure(transposed);
  return { board: transpose(movedBoard), moved, gainedScore };
};

const hasWon = (board, target = 2048) => board.some((row) => row.some((v) => v >= target));
const movesAvailable = (board) => {
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) return true;
      if (c < size - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < size - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

// --- React component ---
const Game2048 = ({ size = 4, target = 2048 }) => {
  const [board, setBoard] = useState(() => createEmptyBoard(size));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem('best2048') || 0));
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);

  const initGame = useCallback(() => {
    let b = createEmptyBoard(size);
    b = addRandomTile(b);
    b = addRandomTile(b);
    setBoard(b);
    setScore(0);
    setWon(false);
    setLost(false);
  }, [size]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem('best2048', String(score));
    }
  }, [score, best]);

  const performMove = useCallback(
    (direction) => {
      if (won || lost) return;
      let result;
      if (direction === 'left') result = moveLeftPure(board);
      else if (direction === 'right') result = moveRightPure(board);
      else if (direction === 'up') result = moveUpPure(board);
      else if (direction === 'down') result = moveDownPure(board);
      else return;

      if (!result.moved) return;

      let newBoard = addRandomTile(result.board);
      setBoard(newBoard);
      setScore((s) => s + result.gainedScore);

      if (hasWon(newBoard, target)) setWon(true);
      if (!movesAvailable(newBoard)) setLost(true);
    },
    [board, won, lost, target],
  );

  useEffect(() => {
    const handler = (e) => {
      const map = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      };
      if (map[e.key]) {
        e.preventDefault();
        performMove(map[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [performMove]);

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">2048 (React)</h1>
          <p className="text-sm text-gray-600">Combine tiles to reach {target}</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-gray-200 rounded p-2 text-center">
            <div className="text-xs text-gray-600">Score</div>
            <div className="font-bold">{score}</div>
          </div>
          <div className="bg-gray-200 rounded p-2 text-center">
            <div className="text-xs text-gray-600">Best</div>
            <div className="font-bold">{best}</div>
          </div>
          <button
            onClick={initGame}
            className="bg-blue-600 text-white px-3 py-1 rounded"
          >
            Restart
          </button>
        </div>
      </div>

      <div className="bg-neutral-500 p-4 rounded-lg">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gap: 12,
          }}
        >
          {board.map((row, r) => (
            <React.Fragment key={r}>
              {row.map((cell, c) => (
                <div key={`${r}-${c}`} className="p-1">
                  <div
                    className="h-20 flex items-center justify-center rounded-lg"
                    style={{ background: getTileBg(cell) }}
                  >
                    <span
                      className="font-bold text-xl"
                      style={{ color: getTileColor(cell) }}
                    >
                      {cell !== 0 ? cell : ''}
                    </span>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2 justify-center">
        <button onClick={() => performMove('up')} className="px-3 py-2 bg-gray-100 rounded">Up</button>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={() => performMove('left')} className="px-3 py-2 bg-gray-100 rounded">Left</button>
            <button onClick={() => performMove('right')} className="px-3 py-2 bg-gray-100 rounded">Right</button>
          </div>
          <button onClick={() => performMove('down')} className="px-3 py-2 bg-gray-100 rounded">Down</button>
        </div>
      </div>

      {(won || lost) && (
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-center">
            <h2 className="text-2xl font-bold mb-2">{won ? 'You win!' : 'Game over'}</h2>
            <p className="mb-4">
              {won ? `You reached ${target}!` : 'No more moves available.'}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={initGame}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Restart
              </button>
              <button
                onClick={() => {
                  setWon(false);
                  setLost(false);
                }}
                className="px-4 py-2 border rounded"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game2048;

// --- Tile Colors ---
function getTileBg(value) {
  if (value === 0) return '#e6e6e6';
  const colors = {
    2: '#eee4da',
    4: '#ede0c8',
    8: '#f2b179',
    16: '#f59563',
    32: '#f67c5f',
    64: '#f65e3b',
    128: '#fabc04ff',
    256: '#edcc61',
    512: '#edc850',
    1024: '#edc53f',
    2048: '#10b010ff',
  };
  return colors[value] || '#3c3a32';
}

function getTileColor(value) {
  if (value <= 4) return '#776e65';
  return '#f9f6f2';
}
