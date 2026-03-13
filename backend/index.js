const path = require('path');
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 4000;
const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const AI_SCRIPT = path.join(__dirname, '..', 'ai', 'ai_engine.py');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const runPython = (payload) =>
  new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [AI_SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => reject(err));

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Invalid JSON from Python: ${stdout}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/move', async (req, res) => {
  try {
    const { board, depth } = req.body;
    const result = await runPython({ action: 'move', board, depth });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tree', async (req, res) => {
  try {
    const { board, depth } = req.body;
    const result = await runPython({ action: 'tree', board, depth });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/winrate', async (req, res) => {
  try {
    const { games, depth } = req.body;
    const result = await runPython({ action: 'winrate', games, depth });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Connect-4 backend listening on port ${PORT}`);
});
