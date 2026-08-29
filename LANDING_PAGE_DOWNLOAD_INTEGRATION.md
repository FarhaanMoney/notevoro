# Landing Page Download Integration

This document explains how to connect the Notevoro landing page download buttons to actual Tauri release binaries from GitHub Releases.

## Quick Reference

For detailed build instructions, see [TAURI_BUILD_GUIDE.md](./TAURI_BUILD_GUIDE.md).

## Current State

- **Landing page**: Live at `/` route
- **Download configuration**: `frontend/src/config/downloads.ts`
- **Download status**: All downloads are currently placeholders (`isPlaceholder: true`)
- **Real binaries**: Not yet built or published

## Making Downloads Live

### 1. Build Tauri Release Binaries

See [TAURI_BUILD_GUIDE.md](./TAURI_BUILD_GUIDE.md) for platform-specific build instructions.

**Quick command:**
```bash
cd src-tauri
cargo tauri build
```

### 2. Create GitHub Release

1. Go to https://github.com/FarhaanMoney/notevoro/releases/new
2. Tag version: `v2.0.0`
3. Release title: `Notevoro 2.0.0`
4. Upload the generated binaries from `src-tauri/target/release/bundle/`

### 3. Update Download Configuration

Edit `frontend/src/config/downloads.ts`:

```typescript
export const DOWNLOADS: Record<string, PlatformDownloads> = {
  macOS: {
    primary: {
      name: "Notevoro_2.0.0_aarch64.dmg",
      url: "https://github.com/FarhaanMoney/notevoro/releases/download/v2.0.0/Notevoro_2.0.0_aarch64.dmg",
      version: "2.0.0",
      isPlaceholder: false,  // ← Change to false when file exists
    },
    // ...
  },
  // ...
};
```

**IMPORTANT:** Only set `isPlaceholder: false` after the file actually exists in the GitHub Release.

### 4. Verify

- Landing page shows download buttons instead of "coming soon"
- Platform detection highlights the appropriate download
- Download buttons open the actual GitHub Release asset URLs

## Expected Asset Filenames

The download configuration expects these exact filenames:

**macOS:**
- `Notevoro_2.0.0_aarch64.dmg` (Apple Silicon)
- `Notevoro_2.0.0_x64.dmg` (Intel)

**Windows:**
- `Notevoro_2.0.0_x64_en-US.msi`
- `Notevoro_2.0.0_x64-setup.exe`

**Linux:**
- `Notevoro_2.0.0_amd64.AppImage`
- `notevoro_2.0.0_amd64.deb`

If Tauri generates different filenames, update the configuration accordingly.

## Platform Detection

The landing page automatically detects the user's OS and highlights the recommended download:

- **macOS**: User agent contains "mac" (not iPhone/iPad)
- **Windows**: User agent contains "win"
- **Linux**: User agent contains "linux"

## UI Behavior

**When no downloads are live:**
- Shows "Desktop apps are coming soon" message
- Download buttons trigger an alert explaining availability
- Links to web version and GitHub repository

**When downloads are live:**
- Shows platform-specific download cards
- Highlights the detected platform with "Recommended" badge
- Only shows platforms that have actual available downloads
- Download buttons open the GitHub Release asset URLs

## Architecture

Personal data remains local:
```
React/TypeScript → Tauri 2 → Rust → Notevoro Vault
                                  ├── Markdown (source of truth)
                                  └── SQLite (rebuildable index)
```

- Supabase is used only for authentication
- Cloud collaboration is separate from personal local data
- The landing page is a public marketing interface only

