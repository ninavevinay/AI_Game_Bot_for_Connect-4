# Connect-4 AI Arena

A full-stack Connect-4 game with a React UI, a Node.js API, and a Python minimax AI. The UI includes a game tree snapshot with zoom controls and live match stats.

## Features
- Play Connect-4 against a minimax AI with alpha-beta pruning.
- Difficulty presets: Easy, Medium, Hard.
- Game tree snapshot rendered as an interactive SVG.
- Zoom controls up to 5000% for detailed tree inspection.
- Match stats (games, wins, draws, win rates).

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- AI engine: Python

## Project Structure
- `frontend/` React UI
- `backend/` Express API
- `ai/` Python minimax engine

## Requirements
- Node.js 18+ (recommended)
- Python 3.9+ (recommended)

## Run Locally
1. Install dependencies:
   - `cd frontend && npm install`
   - `cd backend && npm install`
2. Start backend:
   - `cd backend && npm run dev`
3. Start frontend:
   - `cd frontend && npm run dev`
4. Open the app at `http://localhost:5173`

## Configuration
Frontend (Vite):
- `VITE_API_BASE` (optional) sets the API base URL. Default: `http://localhost:4000`

Backend:
- `PORT` (optional) API port. Default: `4000`
- `PYTHON_BIN` (optional) override Python path. Default: `python`

## API Endpoints
- `GET /api/health` health check
- `POST /api/move` returns AI move
- `POST /api/tree` returns minimax tree
- `POST /api/winrate` returns AI simulation win-rate (backend only; UI is not using this)

Example payloads:
- `/api/move` and `/api/tree`:
  `{ "board": [[...]], "depth": 3 }`
- `/api/winrate`:
  `{ "games": 50, "depth": 3 }`

## Notes
- The UI difficulty presets map to fixed depths: Easy (3), Medium (5), Hard (7).
- Tree depth is fixed in the UI code for consistent visualization.

## Troubleshooting
- If the UI shows an AI error, confirm the backend is running on the same host/port.
- If Python fails to spawn, set `PYTHON_BIN` to a valid Python executable path.
- If the API is hosted elsewhere, set `VITE_API_BASE` before running `npm run dev`.

## License
MIT (or your preferred license)
