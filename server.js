require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');

const PORT = process.env.PORT || 3000;
const TERM_PASS = process.env.TERM_PASS;

if (!TERM_PASS) {
  console.error('Error: TERM_PASS is not set. Add it to your .env file.');
  process.exit(1);
}

// What to run when a browser connects.
// If SSH_HOST is set (Docker mode), hop into the host over SSH so you get your
// real host shell. Otherwise run the local login shell exactly as before.
const SSH_HOST = process.env.SSH_HOST;
const TERM_CMD = SSH_HOST ? 'ssh' : (process.env.SHELL || 'bash');
const TERM_ARGS = SSH_HOST
  ? [
      '-tt',
      '-i', process.env.SSH_KEY || '/keys/id_ed25519',
      '-o', 'StrictHostKeyChecking=accept-new',
      '-o', 'UserKnownHostsFile=/data/ssh/known_hosts',
      '-o', 'ServerAliveInterval=30',
      `${process.env.SSH_USER}@${SSH_HOST}`,
    ]
  : [];

const app = express();

// Single session middleware instance — reused for the WebSocket upgrade guard.
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict' },
});

function isAuthenticated(req) {
  return req.session.authenticated === true;
}

app.use(sessionMiddleware);
app.use(express.urlencoded({ extended: false }));

// --- Auth routes ---

app.get('/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  if (req.body.password === TERM_PASS) {
    req.session.authenticated = true;
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

// --- Protected terminal page ---

app.get('/', (req, res) => {
  if (!isAuthenticated(req)) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static assets (style.css, app.js) — not sensitive, safe to serve openly.
app.use(express.static(path.join(__dirname, 'public')));

// --- HTTP server + WebSocket ---

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Guard WebSocket upgrades: run the same session middleware so we can
// read the cookie and reject unauthenticated connections before spawning a PTY.
server.on('upgrade', (req, socket, head) => {
  sessionMiddleware(req, {}, () => {
    if (!isAuthenticated(req)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });
});

let globalTerm = null;
const activeSockets = new Set();
let termBuffer = '';

function getTerm() {
  if (globalTerm) return globalTerm;

  globalTerm = pty.spawn(TERM_CMD, TERM_ARGS, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: process.env,
  });

  globalTerm.onData((data) => {
    termBuffer += data;
    if (termBuffer.length > 100000) {
      termBuffer = termBuffer.slice(-100000);
    }
    for (const ws of activeSockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  });

  globalTerm.onExit(() => {
    globalTerm = null;
    termBuffer = '';
    for (const ws of activeSockets) {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
  });

  return globalTerm;
}

wss.on('connection', (ws) => {
  activeSockets.add(ws);
  const term = getTerm();

  if (termBuffer) {
    ws.send(termBuffer);
  }

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore anything malformed
    }

    if (msg.type === 'input') {
      term.write(msg.data);
    } else if (msg.type === 'resize' && msg.cols && msg.rows) {
      term.resize(msg.cols, msg.rows);
    }
  });

  ws.on('close', () => {
    activeSockets.delete(ws);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Web terminal running: http://localhost:${PORT}`);
  console.log(`Running command: ${TERM_CMD} ${TERM_ARGS.join(' ')}`);
  console.log('Password protection: ENABLED');
});
