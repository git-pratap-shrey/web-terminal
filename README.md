# web-terminal

A minimal, mobile-first terminal in the browser: designed for you to access your pc from any device via a simple URL on the internet.

xterm.js on the frontend,
`node-pty` + WebSocket on the backend. Runs your actual shell
and streams it to any browser.

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


1. Find your Windows machine's LAN IP (`ipconfig` in PowerShell, the IPv4 address).
2. WSL2 forwards `localhost` ports to Windows automatically, so once `npm start`
   is running in WSL, `http://<windows-lan-ip>:3000` should be reachable from
   your phone on the same Wi-Fi.
3. If it doesn't connect, Windows Firewall is probably blocking the inbound
   port — allow it for Node, or run:
   ```powershell
   netsh advfirewall firewall add rule name="webterm" dir=in action=allow protocol=TCP localport=3000
   ```
4. Alternatively, you can use a `cloudflared` tunnel mapped to port 3000 to access your terminal securely from any device on the internet.
   First, install `cloudflared` (if you haven't already):
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```
   Then, run a Quick Tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   This will output a temporary `https://<random-words>.trycloudflare.com` URL that you can open on your phone or any other device.

## Notes

- The extra key row (Ctrl / Tab / Esc / arrows / Ctrl+C) exists because mobile
  keyboards don't have those keys. Tap **Ctrl**, then the next character you
  type gets sent as that Ctrl combo (e.g. Ctrl then `r` → Ctrl+R).
