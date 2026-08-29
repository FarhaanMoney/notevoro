# Tauri Build Guide for Notevoro

This guide explains how to build Notevoro desktop applications for macOS, Windows, and Linux, and how to publish them via GitHub Releases.

## Prerequisites

- Rust toolchain (1.77 or later)
- Node.js and npm
- Platform-specific build tools (see below)

## Building for macOS

### Prerequisites

- macOS 10.13 (Catalina) or later
- Xcode Command Line Tools: `xcode-select --install`
- Rust with arm64 target for Apple Silicon

### Build Commands

**For Apple Silicon (ARM64):**
```bash
cd src-tauri
cargo tauri build --target aarch64-apple-darwin
```

**For Intel (x64):**
```bash
cd src-tauri
cargo tauri build --target x86_64-apple-darwin
```

**Universal Binary (both architectures):**
```bash
cd src-tauri
cargo tauri build
```

The current Tauri configuration is set to build universal binaries by default (`"architecture": "universal"` in `tauri.conf.json`).

### Generated Files Location

After building, the installers are located at:
```
src-tauri/target/release/bundle/dmg/
```

**Expected filenames:**
- `Notevoro_2.0.0_aarch64.dmg` (Apple Silicon)
- `Notevoro_2.0.0_x64.dmg` (Intel)
- `Notevoro_2.0.0_universal.dmg` (Universal, if built)

### Code Signing (Optional but Recommended)

For distribution outside of GitHub, you may want to code sign the application. Update `tauri.conf.json`:

```json
"macOS": {
  "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
  "entitlements": "path/to/entitlements.plist",
  "providerShortName": "YOUR_TEAM_ID"
}
```

## Building for Windows

### Prerequisites

- Windows 10 or later
- Visual Studio Build Tools (MSVC)
- WebView2 runtime (usually included with Windows 10/11)
- Rust with MSVC target

### Build Command

```bash
cd src-tauri
cargo tauri build
```

### Generated Files Location

After building, the installers are located at:
```
src-tauri/target/release/bundle/msi/     # MSI installer
src-tauri/target/release/bundle/nsis/    # NSIS setup exe
```

**Expected filenames:**
- `Notevoro_2.0.0_x64_en-US.msi` (MSI installer)
- `Notevoro_2.0.0_x64-setup.exe` (NSIS setup)

### Code Signing (Optional but Recommended)

For distribution, code signing prevents Windows security warnings. Update `tauri.conf.json`:

```json
"windows": {
  "certificateThumbprint": "YOUR_CERTIFICATE_THUMBPRINT",
  "digestAlgorithm": "sha256"
}
```

## Building for Linux

### Prerequisites

- Linux distribution with gtk3, webkit2gtk, and libappindicator3
- Rust
- For .deb: dpkg, fakeroot
- For AppImage: appimagetool (optional, Tauri handles this)

### Install Dependencies (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### Build Command

```bash
cd src-tauri
cargo tauri build
```

### Generated Files Location

After building, the installers are located at:
```
src-tauri/target/release/bundle/appimage/  # AppImage
src-tauri/target/release/bundle/deb/       # Debian package
```

**Expected filenames:**
- `Notevoro_2.0.0_amd64.AppImage` (AppImage)
- `notevoro_2.0.0_amd64.deb` (Debian package)

### Making AppImage Executable

```bash
chmod +x src-tauri/target/release/bundle/appimage/Notevoro_2.0.0_amd64.AppImage
```

## Cross-Compilation

Building for platforms other than your current OS requires cross-compilation setup.

### macOS to Windows/Linux

Not recommended. Use GitHub Actions or CI/CD for cross-platform builds.

### Linux to macOS/Windows

Not recommended. Use GitHub Actions or CI/CD for cross-platform builds.

### Recommended: GitHub Actions

Use GitHub Actions to build all platforms automatically. See `.github/workflows/` for workflow examples (to be created).

## Creating a GitHub Release

### Step 1: Tag the Release

```bash
git tag -a v2.0.0 -m "Notevoro 2.0.0"
git push origin v2.0.0
```

### Step 2: Create the Release

1. Go to https://github.com/FarhaanMoney/notevoro/releases/new
2. Select tag: `v2.0.0`
3. Release title: `Notevoro 2.0.0`
4. Description: Add release notes
5. Attach the built binaries

### Step 3: Upload Assets

Upload the following files to the GitHub Release:

**macOS:**
- `Notevoro_2.0.0_aarch64.dmg` (if built)
- `Notevoro_2.0.0_x64.dmg` (if built)

**Windows:**
- `Notevoro_2.0.0_x64_en-US.msi`
- `Notevoro_2.0.0_x64-setup.exe`

**Linux:**
- `Notevoro_2.0.0_amd64.AppImage`
- `notevoro_2.0.0_amd64.deb`

### Step 4: Update Download Configuration

After the release is created and assets are uploaded, update `frontend/src/config/downloads.ts`:

1. Change `isPlaceholder: false` for each uploaded asset
2. Verify the URLs match the actual GitHub Release asset names
3. Test the download buttons on the landing page

## Expected Asset Filenames

The frontend download configuration expects these exact filenames:

### macOS
- Primary: `Notevoro_2.0.0_aarch64.dmg`
- Secondary: `Notevoro_2.0.0_x64.dmg`

### Windows
- Primary: `Notevoro_2.0.0_x64_en-US.msi`
- Secondary: `Notevoro_2.0.0_x64-setup.exe`

### Linux
- Primary: `Notevoro_2.0.0_amd64.AppImage`
- Secondary: `notevoro_2.0.0_amd64.deb`

If Tauri generates different filenames, update the download configuration accordingly.

## Verifying Builds

### macOS

```bash
# Mount and test the DMG
open src-tauri/target/release/bundle/dmg/Notevoro_2.0.0_aarch64.dmg
```

### Windows

```bash
# Run the installer
src-tauri/target/release/bundle/msi/Notevoro_2.0.0_x64_en-US.msi
```

### Linux

```bash
# Run the AppImage
./src-tauri/target/release/bundle/appimage/Notevoro_2.0.0_amd64.AppImage
```

## Troubleshooting

### Build Fails with "webkit2gtk not found" (Linux)

Install the required dependencies:
```bash
sudo apt install libwebkit2gtk-4.0-dev
```

### Build Fails with "linker `link.exe` not found" (Windows)

Install Visual Studio Build Tools with C++ support.

### Build Fails with "code signing error" (macOS)

Either:
1. Disable code signing (remove `signingIdentity` from config)
2. Set up a valid Apple Developer certificate

### Universal Binary Build Fails on macOS

If you're on an Intel Mac, you may not be able to build ARM64 binaries without special setup. Build separately for each architecture or use CI/CD.

## Current Build Status

**Environment:** macOS (Darwin, arm64)

**Can build locally:**
- ✅ macOS ARM64 (Apple Silicon)
- ✅ macOS Universal (if configured)
- ❌ macOS x64 (requires cross-compilation or Intel Mac)
- ❌ Windows (requires Windows or cross-compilation)
- ❌ Linux (requires Linux or cross-compilation)

**Recommendation:** Use GitHub Actions to build all platforms automatically.

## CI/CD Setup (Future)

To automate builds across all platforms, create GitHub Actions workflows that:

1. Build on macOS runner for macOS binaries
2. Build on Windows runner for Windows binaries
3. Build on Ubuntu runner for Linux binaries
4. Upload artifacts as GitHub Release assets

Example workflow structure:
```yaml
name: Build Release
on:
  push:
    tags:
      - 'v*'
jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd src-tauri && cargo tauri build
      - uses: actions/upload-artifact@v4
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd src-tauri && cargo tauri build
      - uses: actions/upload-artifact@v4
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd src-tauri && cargo tauri build
      - uses: actions/upload-artifact@v4
```

## Architecture Notes

The Notevoro desktop application architecture:

```
React/TypeScript Frontend
    ↓
Tauri 2 (Native Bridge)
    ↓
Rust (Native Code)
    ↓
Notevoro Vault (Local Storage)
    ├── Markdown files (source of truth)
    └── SQLite index (rebuildable)
```

**Important:**
- Personal data (knowledge, tasks, calendar, documents) remains local
- Supabase is used only for authentication/account identity
- Cloud collaboration is separate from personal local data
- Do not move personal workspace data into cloud storage
