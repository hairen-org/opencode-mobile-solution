# Architecture

Three components on one always-on host let a phone or another computer drive
OpenCode sessions, without ever handing a client the backend password.

```
 Clients                                 Host (always on)
 ┌──────────────────┐   Tailscale       ┌──────────────────────────────────────┐
 │ app/  (iPhone)   │   HTTPS           │ tailscale serve :8443 (TLS, certs)   │
 │ desktop/ (macOS, │──────────────────▶│        │                             │
 │  Windows)        │   bearer token    │        ▼                             │
 └──────────────────┘                   │ relay 127.0.0.1:4097 (bearer → Basic)│
                                        │        │  X-OpenCode-Target          │
                                        │        ▼                             │
                                        │ opencode serve 127.0.0.1:4096        │
                                        │ opencode serve 127.0.0.1:4098 (opt.) │
                                        └──────────────────────────────────────┘
```

## 1. Backend — `opencode serve`

The host runs one or more persistent `opencode serve` processes on loopback,
behind HTTP Basic auth (`OPENCODE_SERVER_USERNAME` / `OPENCODE_SERVER_PASSWORD`).
`host/deploy-macos.sh --managed-backend name:port[:profile]` installs each as a
launchd service. Backends on one host share one session database, so every
backend lists the same sessions; they differ in which process (and which model
configuration) runs the next prompt. The TUI on the host and the remote clients
see the same live sessions.

## 2. Transport — Tailscale

The backend is not exposed to the internet, and there is no tunnel to maintain.
The relay runs on the same host as the backends and binds loopback only.
`tailscale serve` publishes it to the tailnet as
`https://<machine>.<tailnet>.ts.net:8443` and terminates TLS with certificates it
issues and renews itself. Every device in the topology is a tailnet node, so
there is no public listener, no port forwarding, and no certificate to renew by
hand. It does not buffer server-sent events (measured: about 11 ms over a direct
connection).

A setup without Tailscale can put Caddy or nginx in front of the relay instead;
`relay/reverse-proxy/` has examples. Response buffering must be off there, or
prompt streaming and event streams stall.

## 3. Relay — `relay/relay.mjs`

The relay listens only on `127.0.0.1:4097` and does four things:

- **Token translation.** A client sends `Authorization: Bearer <token>`. The
  relay validates it with a constant-time comparison and rewrites it to
  `Authorization: Basic <user:pass>` for the selected backend.
- **Multi-target routing.** A client may be authorized for several backends. The
  request selects one with `X-OpenCode-Target`; the relay validates the selection
  before proxying. `GET /relay/targets` returns only target IDs and display
  names, never addresses or credentials.
- **Directory scope.** The `directory` query parameter and `X-OpenCode-Directory`
  header are validated against the client's pin/allowlist; conflicts or
  disallowed directories are rejected before forwarding.
- **Phone pairing.** A passkey-protected dashboard (WebAuthn) issues single-use
  QR codes for phones and revokes them.

## 4. Clients — `app/` and `desktop/`

The iPhone app and the desktop client are the same Expo / React Native code. The
desktop client is an Electron shell that loads the app's web export and adds
what a page cannot do itself: the TUI keybindings, tray residency, start at
login and system notifications.

Clients follow the server through two kinds of event stream:

- **The open session's stream** (`/event`) delivers messages, tool output,
  status, todo lists and errors for the directory being viewed.
- **A global stream per backend** (`/global/event`) delivers events from every
  directory. The client keeps it open while the app runs and uses it for what
  needs the user wherever it happens: permission requests and questions (often
  raised by subagents in child sessions nobody has open) and failed turns. These
  drive the waiting badge and the red "Stopped" mark on the session list, the
  in-app banner, and desktop notifications.

A failed turn is not output. The server stores `{ name, data: { message } }` on
the assistant message (`info.error`) and emits `session.error`; the client
renders both as red error boxes, so a session never stops without a visible
reason.

## Phone pairing

1. The owner signs in to the dashboard with a passkey and presses **Connect
   phone**, producing a single-use QR code that expires in two minutes.
2. The app scans it and exchanges the code once at
   `POST /api/pairing/exchange`, receiving a revocable, no-expiry device
   credential it stores in the device keychain.
3. Only a SHA-256 hash of that credential is stored on the relay. Revoking a
   device from the dashboard closes its active streams immediately.

## Security model

- Device bearer credentials are stored only as hashes; raw values are returned
  once.
- The relay and the backends bind to loopback; TLS belongs to the tailnet layer.
- `tokens.json`, `passkeys.json`, and `*.env` hold live secrets and are
  git-ignored.
- Authorization headers are stripped from all relay logs.
- The first-registration bootstrap secret stops working once the first passkey
  exists.
