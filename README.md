# OpenCode Remote

## 这是什么

把跑在自己电脑上的 OpenCode 会话，带到手机和另一台电脑上。

一台常开的主机跑 OpenCode 后端，中继在前面做鉴权和分流，客户端通过 Tailscale 内网连过来。不开公网端口，不经第三方服务器，凭证在自己手里。手机上能看同一批会话、发指令、看回复；桌面客户端（macOS / Windows）是同一套界面，多一套和 TUI 一致的键盘操作。一台主机可以挂多个后端，一个客户端也可以同时连多台主机。

**项目来自朋友 [BB-84C](https://github.com/BB-84C) 的 [opencode-mobile-solution](https://github.com/BB-84C/opencode-mobile-solution)**。这个分支在它的中继和手机端之上，改成了 tailnet 直连，加了 macOS 一键部署和 Electron 桌面端，去掉了原本的 VPS / 内网穿透那条路。应用图标也是他的作品，经本人同意后沿用。

客户端能做的事，除了收发消息：

- **任意选中复制**：手机上可以选中几个字，也可以跨段落选；桌面上可以跨消息拖选。
- **公式**：回答里的 LaTeX 用 KaTeX 排版，复制时得到 `$...$` 源码。
- **todo 看板**：和 TUI 侧栏一样，显示主 agent 的任务列表和进度。
- **报错**：回合失败的原因（API 错误、网络错误、模型不存在）显示在红色报错框里，不会无声地停住。
- **待处理请求**：子 agent 的权限申请在父会话里就能批准。有权限、问题或报错在等你时，会话列表上会标出来；桌面端会弹系统通知，并常驻托盘。

## In English

Reach your own [OpenCode](https://github.com/anomalyco/opencode) sessions from a
phone or another computer. One always-on host runs the OpenCode backends and a
small relay; clients reach it over your Tailscale network. Nothing listens on the
public internet, no third-party server sits in the path, and you hold every
credential.

| Part | What it is |
|------|------------|
| **`host/`** | One-command deployment for a macOS host: OpenCode backends and the relay as launchd services, published on the tailnet with `tailscale serve` (HTTPS with automatic certificates). |
| **`relay/`** | A small Node service bound to loopback. It turns each device's bearer token into the backend's Basic auth, routes between several backends, enforces per-device directory scope, and hosts a passkey-protected dashboard for pairing and revoking phones. |
| **`app/`** | The Expo / React Native client. The same code builds the iPhone app and the web bundle the desktop client loads. |
| **`desktop/`** | An Electron shell around that bundle for macOS and Windows: TUI keybindings, tray residency, start at login, system notifications. |
| **`clients/README.md`** | How to make a client machine reach the tailnet while Shadowrocket, Clash or a similar VPN owns its routes. |

What the clients add beyond chat: selecting any part of a reply (also across
paragraphs, and across messages on the desktop); LaTeX rendered with KaTeX and
copied back as TeX; the TUI's todo list as a board; failed turns shown in red
boxes instead of a silent stop; and subagent permission requests answered from
the parent session, with a waiting badge, desktop notifications and a tray
icon.

## How it fits together

```
 Phone / desktop client                 Host (always on)
 ┌──────────────────┐   Tailscale      ┌──────────────────────────────────────┐
 │ app/  (iPhone)   │   HTTPS          │ tailscale serve  :8443  (TLS, certs) │
 │ desktop/ (macOS, │─────────────────▶│        │                             │
 │  Windows)        │  bearer token    │        ▼                             │
 └──────────────────┘                  │ relay  127.0.0.1:4097                │
                                       │   bearer → Basic, target routing     │
                                       │        │                             │
                                       │        ▼                             │
                                       │ opencode serve 127.0.0.1:4096 (,4098)│
                                       └──────────────────────────────────────┘
```

1. The host runs one or more `opencode serve` backends on loopback, behind Basic
   auth.
2. The relay, on the same host and also on loopback, checks a client's bearer
   token, rewrites it to Basic auth, and forwards to the backend the client
   selected. A client never sees the backend password.
3. `tailscale serve` publishes the relay to the tailnet as
   `https://<machine>.<tailnet>.ts.net:8443`, terminating TLS with certificates
   it renews itself.
4. A phone pairs once by scanning a single-use QR code from the relay dashboard
   and keeps a revocable credential in its keychain.

Details: [`docs/architecture.md`](docs/architecture.md).

## Quick start

1. **Host.** On the Mac that stays on, run `host/deploy-macos.sh` with one
   `--managed-backend name:port` per backend. See [`host/README.md`](host/README.md).
2. **Desktop client.** In `app/` and `desktop/` run `npm ci`, then
   `npm run package` in `desktop/` to build the package for the platform you are
   on (`-- --platform=win32` cross-builds Windows from a Mac). See
   [`desktop/README.md`](desktop/README.md).
3. **iPhone app.** Set your own `name`, `slug` and `ios.bundleIdentifier` in
   `app/app.json`, then build and install with Xcode as
   [`app/README.md`](app/README.md) describes. A free Apple ID signs for seven
   days; with the phone plugged in, `IOS_TEAM=<your team id>
   host/renew-ios-app.sh` rebuilds, re-signs and reinstalls in one command.

There are no prebuilt public binaries: the desktop packages are unsigned, and an
iPhone build is tied to the developer account that signs it.

## Security notes

- The relay stores only SHA-256 hashes of device credentials. Raw credentials
  are returned once and never written to disk.
- `tokens.json`, `passkeys.json`, and `*.env` hold live secrets. They are
  git-ignored here; keep them that way.
- Rotate any credential that has ever been committed, printed, or shared.
- The relay and the backends listen only on `127.0.0.1`; TLS belongs to the
  tailnet layer.

## Layout

```
host/           macOS host deployment, uninstall, iPhone re-signing
relay/          relay service (Node), with reverse-proxy examples for non-tailnet setups
app/            Expo / React Native client (iPhone app and desktop web bundle)
desktop/        Electron shell for macOS and Windows
clients/        notes for client machines that also run a third-party VPN
docs/           architecture, differences from upstream, specs and investigations
deploy-notes/   the maintainer's own deployment notes (personal to one setup)
```

## License

MIT — see [LICENSE](LICENSE).
