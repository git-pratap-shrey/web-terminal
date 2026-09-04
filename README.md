# web-terminal

A minimal, mobile-friendly terminal in the browser: xterm.js on the frontend,
`node-pty` + WebSocket on the backend. Runs your actual shell (or an SSH
session) and streams it to any browser.

## Setup (in WSL Ubuntu)

`node-pty` needs to compile a native module, so make sure build tools are present:

```bash
sudo apt update && sudo apt install -y python3 make g++
```

Then install dependencies:

```bash
cd web-terminal
npm install
```

## Run

```bash
npm start
```

Open `http://localhost:3000` in a browser. That's your local shell, in a tab.

### Point it at a remote host over SSH instead of a local shell

```bash
TERM_CMD="ssh" TERM_ARGS="youruser@remotehost" npm start
```

(`TERM_ARGS` is space-separated, so add `-p 2222` etc. in there too if needed.)

## Using it from your phone

1. Find your Windows machine's LAN IP (`ipconfig` in PowerShell, the IPv4 address).
2. WSL2 forwards `localhost` ports to Windows automatically, so once `npm start`
   is running in WSL, `http://<windows-lan-ip>:3000` should be reachable from
   your phone on the same Wi-Fi.
3. If it doesn't connect, Windows Firewall is probably blocking the inbound
   port — allow it for Node, or run:
   ```powershell
   netsh advfirewall firewall add rule name="webterm" dir=in action=allow protocol=TCP localport=3000
   ```

## Notes

- The extra key row (Ctrl / Tab / Esc / arrows / Ctrl+C) exists because mobile
  keyboards don't have those keys. Tap **Ctrl**, then the next character you
  type gets sent as that Ctrl combo (e.g. Ctrl then `r` → Ctrl+R).
- No auth, no TLS, no sandboxing — anyone who can reach the port has a shell
  on this machine. Fine for localhost/LAN use, just don't put it on the open
  internet as-is.
- Tested end-to-end in a sandboxed environment (WebSocket protocol + shell
  I/O piping); `node-pty`'s native build itself wasn't compiled in that
  sandbox since it needed to reach `nodejs.org`, but it's a standard, widely
  used package — `npm install` should build cleanly wherever you normally
  have internet access.
