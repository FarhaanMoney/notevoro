# Notevoro Desktop (Tauri 2)

Rust owns the vault (`src-tauri/src/vault.rs`): a user-selected folder of Markdown files is the source of truth; `.notevoro/index.db` (SQLite + FTS5) is a rebuildable index.
The webview only receives the explicit `vault_*` commands listed in `src/lib.rs` — no generic filesystem API is exposed (`capabilities/default.json`).

Build locally (requires Rust toolchain + Tauri CLI):
```
export NOTEVORO_API_URL=https://api.your-domain.com   # never localhost in production
cd desktop && cargo tauri build
```
Release artifacts (macOS arm64/x64, Windows MSI/NSIS, Linux AppImage/DEB) are produced by `.github/workflows/desktop-release.yml` on `v*` tags. Do not publish a draft as production-ready until it has been tested.
