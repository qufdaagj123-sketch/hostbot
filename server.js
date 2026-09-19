/**
 * MinhNhat Bot Panel
 * Dán token → chạy bot Python (toàn bộ lệnh trong bot_template.py, prefix .)
 *
 * npm install && npm start
 * Cần Python3 + venv
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const WORK = path.join(ROOT, 'bots', 'main');
const TEMPLATE = path.join(ROOT, 'bot_template.py');
const REQ = path.join(ROOT, 'requirements.txt');

if (!fs.existsSync(path.join(ROOT, 'bots'))) fs.mkdirSync(path.join(ROOT, 'bots'), { recursive: true });
if (!fs.existsSync(WORK)) fs.mkdirSync(WORK, { recursive: true });

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static(path.join(ROOT, 'public')));

let proc = null;
const logs = [];
const sse = new Set();

function push(type, text) {
  const e = { type, text: String(text).replace(/\r/g, ''), time: Date.now() };
  logs.push(e);
  if (logs.length > 400) logs.shift();
  const line = `data: ${JSON.stringify(e)}\n\n`;
  for (const r of sse) {
    try { r.write(line); } catch {}
  }
}

function setupEnv() {
  fs.copyFileSync(TEMPLATE, path.join(WORK, 'bot.py'));
  fs.copyFileSync(REQ, path.join(WORK, 'requirements.txt'));
  const isWin = process.platform === 'win32';
  const py = isWin
    ? path.join(WORK, 'venv', 'Scripts', 'python.exe')
    : path.join(WORK, 'venv', 'bin', 'python');
  const pip = isWin
    ? path.join(WORK, 'venv', 'Scripts', 'pip.exe')
    : path.join(WORK, 'venv', 'bin', 'pip');

  if (!fs.existsSync(py)) {
    push('sys', 'Tạo venv...');
    try {
      execSync('python3 -m venv venv', { cwd: WORK, stdio: 'pipe', timeout: 90000 });
    } catch {
      execSync('python -m venv venv', { cwd: WORK, stdio: 'pipe', timeout: 90000 });
    }
    push('sys', 'Venv OK');
  }
  push('sys', 'pip install...');
  try {
    execSync(`"${pip}" install -r requirements.txt -q`, {
      cwd: WORK, stdio: 'pipe', timeout: 180000, shell: true
    });
    push('sys', 'pip xong');
  } catch (e) {
    try {
      execSync(`"${py}" -m pip install --upgrade pip -q`, { cwd: WORK, stdio: 'pipe', timeout: 60000, shell: true });
      execSync(`"${pip}" install -r requirements.txt -q`, {
        cwd: WORK, stdio: 'pipe', timeout: 180000, shell: true
      });
      push('sys', 'pip xong (retry)');
    } catch (e2) {
      push('err', 'pip lỗi: ' + (e2.message || '').slice(0, 200));
      throw new Error('Cài package thất bại');
    }
  }
  return py;
}

function stopBot() {
  if (!proc) return;
  try { proc.kill('SIGTERM'); } catch {}
  setTimeout(() => {
    if (proc) {
      try { proc.kill('SIGKILL'); } catch {}
      proc = null;
    }
  }, 2000);
  proc = null;
  push('sys', '■ Đã stop bot');
}

app.get('/api/status', (req, res) => {
  res.json({ running: !!(proc && !proc.killed), logs: logs.length });
});

app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  logs.slice(-50).forEach(e => res.write(`data: ${JSON.stringify(e)}\n\n`));
  sse.add(res);
  req.on('close', () => sse.delete(res));
});

app.post('/api/start', (req, res) => {
  const token = (req.body.token || '').trim();
  if (!token || token.length < 50) {
    return res.status(400).json({ error: 'Token bot không hợp lệ' });
  }
  if (proc) {
    return res.status(400).json({ error: 'Bot đang chạy — Stop trước' });
  }

  try {
    push('sys', '▶ Chuẩn bị bot MinhNhat...');
    const py = setupEnv();
    const env = {
      ...process.env,
      DISCORD_TOKEN: token,
      TOKEN: token,
      PYTHONUNBUFFERED: '1',
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
      POLLINATIONS_API_KEY: process.env.POLLINATIONS_API_KEY || '',
      NASA_API_KEY: process.env.NASA_API_KEY || '',
      TEMPMAIL_API_KEY: process.env.TEMPMAIL_API_KEY || '',
      LUA_OBF_API_KEY: process.env.LUA_OBF_API_KEY || ''
    };
    proc = spawn(py, ['bot.py'], {
      cwd: WORK,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    proc.stdout.on('data', d => push('out', d));
    proc.stderr.on('data', d => push('err', d));
    proc.on('close', code => {
      push('sys', 'Process exited: ' + code);
      proc = null;
    });
    proc.on('error', err => {
      push('err', err.message);
      proc = null;
    });
    push('sys', 'Process đã chạy — đợi login Discord...');
    res.json({ success: true });
  } catch (e) {
    push('err', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/stop', (req, res) => {
  if (!proc) return res.status(400).json({ error: 'Bot không chạy' });
  stopBot();
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\nMinhNhat Bot Panel → http://localhost:${PORT}\n`);
});
