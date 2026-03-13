import React, { useState } from 'react';

const ROWS = 6;
const COLS = 7;
const HUMAN = 'R';
const AI = 'Y';
const EMPTY = null;

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const DIFFICULTY_LEVELS = [
  { label: 'Easy', depth: 3 },
  { label: 'Medium', depth: 5 },
  { label: 'Hard', depth: 7 },
];

const TREE_DEPTH = 3;

const createEmptyBoard = () =>
  Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => EMPTY));

const copyBoard = (board) => board.map((row) => row.slice());

const getNextOpenRow = (board, col) => {
  for (let r = ROWS - 1; r >= 0; r -= 1) {
    if (board[r][col] === EMPTY) return r;
  }
  return -1;
};

const dropPiece = (board, row, col, piece) => {
  const newBoard = copyBoard(board);
  newBoard[row][col] = piece;
  return newBoard;
};

const winningMove = (board, piece) => {
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      if (
        board[r][c] === piece &&
        board[r][c + 1] === piece &&
        board[r][c + 2] === piece &&
        board[r][c + 3] === piece
      ) {
        return true;
      }
    }
  }

  for (let c = 0; c < COLS; c += 1) {
    for (let r = 0; r < ROWS - 3; r += 1) {
      if (
        board[r][c] === piece &&
        board[r + 1][c] === piece &&
        board[r + 2][c] === piece &&
        board[r + 3][c] === piece
      ) {
        return true;
      }
    }
  }

  for (let r = 0; r < ROWS - 3; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      if (
        board[r][c] === piece &&
        board[r + 1][c + 1] === piece &&
        board[r + 2][c + 2] === piece &&
        board[r + 3][c + 3] === piece
      ) {
        return true;
      }
    }
  }

  for (let r = 3; r < ROWS; r += 1) {
    for (let c = 0; c < COLS - 3; c += 1) {
      if (
        board[r][c] === piece &&
        board[r - 1][c + 1] === piece &&
        board[r - 2][c + 2] === piece &&
        board[r - 3][c + 3] === piece
      ) {
        return true;
      }
    }
  }

  return false;
};

const getWinner = (board) => {
  if (winningMove(board, HUMAN)) return HUMAN;
  if (winningMove(board, AI)) return AI;
  const hasMoves = board[0].some((cell) => cell === EMPTY);
  if (!hasMoves) return 'D';
  return null;
};

const TreeGraph = ({ tree, zoom = 1 }) => {
  if (!tree || !tree.nodes || tree.nodes.length === 0) {
    return <div className="empty">Tree will appear after the first AI request.</div>;
  }

  const levels = tree.nodes.reduce((acc, node) => {
    acc[node.depth] = acc[node.depth] || [];
    acc[node.depth].push(node);
    return acc;
  }, {});

  const positions = new Map();
  const spacingX = 120;
  const spacingY = 90;

  Object.keys(levels)
    .map((d) => Number(d))
    .sort((a, b) => a - b)
    .forEach((depth) => {
      const nodesAtDepth = levels[depth];
      const levelWidth = (nodesAtDepth.length - 1) * spacingX;
      const startX = -levelWidth / 2;
      nodesAtDepth.forEach((node, idx) => {
        const x = startX + idx * spacingX;
        const y = depth * spacingY;
        positions.set(node.id, { x, y });
      });
    });

  let minX = 0;
  let maxX = 0;
  let maxY = 0;
  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
  });

  const width = maxX - minX + 200;
  const height = maxY + 140;

  return (
    <svg
      className="tree"
      viewBox={`${minX - 100} -60 ${width} ${height}`}
      style={{ transform: `scale(${zoom})`, transformOrigin: '50% 50%' }}
    >
      {tree.nodes.map((node) => {
        if (!node.parentId) return null;
        const from = positions.get(node.parentId);
        const to = positions.get(node.id);
        if (!from || !to) return null;
        return (
          <line
            key={`edge-${node.id}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
          />
        );
      })}
      {tree.nodes.map((node) => {
        const pos = positions.get(node.id);
        if (!pos) return null;
        return (
          <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
            <circle
              r="22"
              fill={node.isBest ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
            />
            <text className="tree-label" textAnchor="middle" y="5">
              {node.move === null ? 'root' : node.move + 1}
            </text>
            <text className="tree-score" textAnchor="middle" y="28">
              {Math.round(node.score)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const App = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(HUMAN);
  const [status, setStatus] = useState('Your move.');
  const [gameOver, setGameOver] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [hoverCol, setHoverCol] = useState(null);
  const [aiDepth, setAiDepth] = useState(3);
  const [difficulty, setDifficulty] = useState('Easy');
  const [tree, setTree] = useState({ nodes: [] });
  const [treeZoom, setTreeZoom] = useState(1);
  const [stats, setStats] = useState({ games: 0, human: 0, ai: 0, draws: 0 });

  const winRate = stats.games ? Math.round((stats.ai / stats.games) * 100) : 0;
  const humanRate = stats.games ? Math.round((stats.human / stats.games) * 100) : 0;
  const drawRate = stats.games ? Math.round((stats.draws / stats.games) * 100) : 0;

  const finalizeGame = (winner) => {
    setGameOver(true);
    if (winner === HUMAN) {
      setStatus('You win. Strong finish.');
      setStats((prev) => ({
        games: prev.games + 1,
        human: prev.human + 1,
        ai: prev.ai,
        draws: prev.draws,
      }));
    } else if (winner === AI) {
      setStatus('AI wins. Try a new opening.');
      setStats((prev) => ({
        games: prev.games + 1,
        human: prev.human,
        ai: prev.ai + 1,
        draws: prev.draws,
      }));
    } else {
      setStatus('Draw. Even match.');
      setStats((prev) => ({
        games: prev.games + 1,
        human: prev.human,
        ai: prev.ai,
        draws: prev.draws + 1,
      }));
    }
  };

  const fetchTree = async (boardState) => {
    try {
      const res = await fetch(`${API_BASE}/api/tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: boardState, depth: TREE_DEPTH }),
      });
      const data = await res.json();
      setTree(data);
    } catch (err) {
      setTree({ nodes: [] });
    }
  };

  const requestAiMove = async (boardState) => {
    setAiThinking(true);
    setStatus('AI is thinking...');
    setCurrentPlayer(AI);

    try {
      const res = await fetch(`${API_BASE}/api/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: boardState, depth: aiDepth }),
      });
      const data = await res.json();
      if (data.col === null || data.col === undefined) {
        setStatus('AI has no move.');
        setAiThinking(false);
        return;
      }
      const row = getNextOpenRow(boardState, data.col);
      if (row === -1) {
        setStatus('AI selected a full column.');
        setAiThinking(false);
        setCurrentPlayer(HUMAN);
        return;
      }
      const nextBoard = dropPiece(boardState, row, data.col, AI);
      setBoard(nextBoard);
      const winner = getWinner(nextBoard);
      if (winner) {
        finalizeGame(winner);
      } else {
        setStatus('Your move.');
        setCurrentPlayer(HUMAN);
      }
      setAiThinking(false);
      fetchTree(nextBoard);
    } catch (err) {
      setStatus('AI service error. Check backend.');
      setAiThinking(false);
    }
  };

  const handleColumnClick = (col) => {
    if (gameOver || aiThinking || currentPlayer !== HUMAN) return;
    const row = getNextOpenRow(board, col);
    if (row === -1) return;
    const nextBoard = dropPiece(board, row, col, HUMAN);
    setBoard(nextBoard);
    const winner = getWinner(nextBoard);
    if (winner) {
      finalizeGame(winner);
      return;
    }
    requestAiMove(nextBoard);
  };

  const startNewGame = (aiStarts = false) => {
    const fresh = createEmptyBoard();
    setBoard(fresh);
    setGameOver(false);
    setTree({ nodes: [] });
    if (aiStarts) {
      setStatus('AI opens.');
      requestAiMove(fresh);
    } else {
      setStatus('Your move.');
      setCurrentPlayer(HUMAN);
    }
  };


  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="title">Connect-4 AI Arena</div>
          <div className="subtitle">React UI + Node API + Python minimax with alpha-beta pruning.</div>
        </div>
        <div className="legend">
          <span className="legend-dot" style={{ background: 'var(--red)' }}></span>
          You
          <span className="legend-dot" style={{ background: 'var(--yellow)', marginLeft: '12px' }}></span>
          AI
        </div>
      </header>

      <div className="layout">
        <section className="panel board-panel">
          <div className="status">{status}</div>
          <div className="board">
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isHover = hoverCol === cIdx && !gameOver && currentPlayer === HUMAN;
                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`cell ${isHover ? 'hover' : ''}`}
                    onClick={() => handleColumnClick(cIdx)}
                    onMouseEnter={() => setHoverCol(cIdx)}
                    onMouseLeave={() => setHoverCol(null)}
                  >
                    {cell && <div className={`disc ${cell === HUMAN ? 'red' : 'yellow'}`}></div>}
                  </div>
                );
              })
            )}
          </div>
          <div className="controls">
            <button onClick={() => startNewGame(false)} disabled={aiThinking}>
              New Game
            </button>
            <button className="secondary" onClick={() => startNewGame(true)} disabled={aiThinking}>
              AI Starts
            </button>
            <button className="secondary" onClick={() => fetchTree(board)} disabled={aiThinking}>
              Update Tree
            </button>
          </div>
          <div className="range">
            <span>Difficulty</span>
            <select
              value={difficulty}
              onChange={(e) => {
                const selected = e.target.value;
                const preset = DIFFICULTY_LEVELS.find((level) => level.label === selected);
                if (preset) {
                  setAiDepth(preset.depth);
                  setDifficulty(preset.label);
                }
              }}
              disabled={aiThinking}
            >
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level.label} value={level.label}>
                  {level.label} (Depth {level.depth})
                </option>
              ))}
            </select>
          </div>
        </section>
        <section className="panel tree-panel">
          <div className="section-title">Game Tree Snapshot</div>
          <div className="tree-controls">
            <span>Zoom: {(treeZoom * 100).toFixed(0)}%</span>
            <input
              type="range"
              min="0.6"
              max="50"
              step="0.1"
              value={treeZoom}
              onChange={(e) => setTreeZoom(Number(e.target.value))}
            />
            <button className="secondary" onClick={() => setTreeZoom(1)}>
              Reset
            </button>
          </div>
          <div className="tree-wrap">
            <TreeGraph tree={tree} zoom={treeZoom} />
          </div>
        </section>

        <section className="panel stats-panel">
          <div className="stats">
            <div className="stat">
              <span>Games</span>
              <strong>{stats.games}</strong>
            </div>
            <div className="stat">
              <span>You</span>
              <strong>{stats.human}</strong>
            </div>
            <div className="stat">
              <span>AI</span>
              <strong>{stats.ai}</strong>
            </div>
            <div className="stat">
              <span>Draws</span>
              <strong>{stats.draws}</strong>
            </div>
            <div className="stat">
              <span>AI Win Rate</span>
              <strong>{winRate}%</strong>
            </div>
            <div className="stat">
              <span>Human Win Rate</span>
              <strong>{humanRate}%</strong>
            </div>
            <div className="stat">
              <span>Draw Rate</span>
              <strong>{drawRate}%</strong>
            </div>
          </div>

        </section>

        
      </div>
    </div>
  );
};

export default App;
