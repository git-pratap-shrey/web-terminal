(function () {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const container = document.getElementById('term-container');

  const term = new Terminal({
    cursorBlink: true,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 15,
    theme: {
      background: '#151513',
      foreground: '#e8e6df',
      cursor: '#ffb000',
      selectionBackground: '#3a3428',
    },
  });

  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(container);
  fitAddon.fit();
  term.focus();

  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  const ws = new WebSocket(proto + location.host);

  function setStatus(online, label) {
    statusDot.classList.toggle('online', online);
    statusDot.classList.toggle('offline', !online);
    statusText.textContent = label;
  }

  function sendResize() {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
  }

  function sendInput(data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
    }
  }

  ws.addEventListener('open', () => {
    setStatus(true, 'connected');
    fitAddon.fit();
    sendResize();
  });
  ws.addEventListener('close', () => setStatus(false, 'disconnected'));
  ws.addEventListener('error', () => setStatus(false, 'error'));
  ws.addEventListener('message', (event) => term.write(event.data));

  // --- Ctrl toggle for mobile: next keystroke becomes Ctrl+<key> ---
  let ctrlActive = false;
  const ctrlBtn = document.getElementById('ctrl-btn');

  term.onData((data) => {
    if (ctrlActive && data.length === 1) {
      const upper = data.toUpperCase();
      const code = upper.charCodeAt(0) - 64; // A=1 ... Z=26
      if (code >= 1 && code <= 26) {
        sendInput(String.fromCharCode(code));
        ctrlActive = false;
        ctrlBtn.classList.remove('active');
        return;
      }
    }
    sendInput(data);
  });

  // --- Extra key row (mobile keyboards lack Ctrl/Esc/Tab/arrows) ---
  const SEQUENCES = {
    tab: '\t',
    esc: '\x1b',
    up: '\x1b[A',
    down: '\x1b[B',
    left: '\x1b[D',
    right: '\x1b[C',
    ctrlc: '\x03',
  };

  document.getElementById('keybar').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-key]');
    if (!btn) return;
    const key = btn.dataset.key;

    if (key === 'ctrl') {
      ctrlActive = !ctrlActive;
      ctrlBtn.classList.toggle('active', ctrlActive);
    } else if (SEQUENCES[key]) {
      sendInput(SEQUENCES[key]);
    }
    term.focus();
  });

  // --- Resize handling: window resize + mobile keyboard show/hide ---
  const appEl = document.getElementById('app');
  function refit() {
    if (window.visualViewport) {
      // Fix mobile keyboard pushing the extra buttons down
      appEl.style.height = window.visualViewport.height + 'px';
      
      // Also scroll to top to prevent the layout viewport from being shifted
      window.scrollTo(0, 0);
    }
    fitAddon.fit();
    sendResize();
  }
  
  window.addEventListener('resize', refit);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', refit);
    // Initial set
    appEl.style.height = window.visualViewport.height + 'px';
  }
})();
