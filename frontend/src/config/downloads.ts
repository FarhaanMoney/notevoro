/**
 * Download configuration for Notevoro desktop application.
 * 
 * This module centralizes all download URLs and platform-specific information.
 * When Tauri release builds are available on GitHub Releases, update the
 * release URLs in the DOWNLOADS object below and set isPlaceholder to false.
 * 
 * IMPORTANT: Do NOT set isPlaceholder to false unless the corresponding file
 * actually exists in the GitHub Release. Never link to nonexistent assets.
 * 
 * To integrate with GitHub Releases:
 * 1. Build Tauri releases: `cargo tauri build`
 * 2. Create a GitHub Release: https://github.com/FarhaanMoney/notevoro/releases/new
 * 3. Upload the generated binaries from src-tauri/target/release/bundle/
 * 4. Update the URLs below to point to the actual release assets
 * 5. Set isPlaceholder: false for each live download
 * 
 * GitHub Release URL format:
 * https://github.com/FarhaanMoney/notevoro/releases/download/v{VERSION}/{ASSET_NAME}
 */

export interface PlatformDownload {
  name: string;
  url: string;
  version: string;
  size?: string;
  isPlaceholder: boolean;
}

export interface PlatformDownloads {
  primary: PlatformDownload;
  secondary?: PlatformDownload[];
}

/**
 * Current download configuration for Notevoro v2.0.0.
 * 
 * STATUS: LOCAL MACOS BUILD COMPLETED, GITHUB RELEASE PENDING
 * 
 * A macOS ARM64 .dmg has been built locally at:
 * src-tauri/target/release/bundle/dmg/Notevoro_2.0.0_aarch64.dmg
 * 
 * However, the GitHub Release v2.0.0 has NOT been created yet.
 * All downloads remain placeholders until:
 * 1. Commit changes are pushed
 * 2. Git tag v2.0.0 is pushed
 * 3. GitHub Actions builds all platforms
 * 4. Release assets are uploaded
 * 
 * TO ENABLE DOWNLOADS:
 * 1. Push commits to GitHub
 * 2. Create and push tag: git tag v2.0.0 && git push origin v2.0.0
 * 3. Wait for GitHub Actions to complete
 * 4. Set isPlaceholder: false for each uploaded asset
 */
export const DOWNLOADS: Record<string, PlatformDownloads> = {
  macOS: {
    primary: {
      name: "Notevoro_2.0.0_aarch64.dmg",
      url: "https://github.com/FarhaanMoney/notevoro/releases/download/v2.0.0/Notevoro_2.0.0_aarch64.dmg",
      version: "2.0.0",
      isPlaceholder: true, // Set to false after GitHub Release is created with this asset
    },
    secondary: [
      {
        name: "Notevoro_2.0.0_x64.dmg",
        url: "https://github.com/FarhaanMoney/notevoro/releases/download/v2.0.0/Notevoro_2.0.0_x64.dmg",
        version: "2.0.0",
        isPlaceholder: true, // Set to false after GitHub Release is created with this asset
      },
    ],
  },
  windows: {
    primary: {
      name: "Notevoro_2.0.0_x64_en-US.msi",
      url: "https://github.com/FarhaanMoney/notevoro/releases/download/v2.0.0/Notevoro_2.0.0_x64_en-US.msi",
      version: "2.0.0",
      isPlaceholder: true, // Set to false after GitHub Release is created with this asset
    },
    secondary: [
      {
        name: "Notevoro_2.0.0_x64-setup.exe",
        url: "https://github.com/FarhaanMoney/notevoro/releases/download/v2.0.0/Notevoro_2.0.0_x64-setup.exe",
        version: "2.0.0",
        isPlaceholder: true, // Set to false after GitHub Release is created with this asset
      },
    ],
  },
  linux: {
    primary: {
      name: "Notevoro_2.0.0_amd64.AppImage",
      url: "https://github.com/FarhaanMoney/notevoro/releases/download/v2.0.0/Notevoro_2.0.0_amd64.AppImage",
      version: "2.0.0",
      isPlaceholder: true, // Set to false after GitHub Release is created with this asset
    },
    secondary: [
      {
        name: "notevoro_2.0.0_amd64.deb",
        url: "https://github.com/FarhaanMoney/notevoro/releases/download/v2.0.0/notevoro_2.0.0_amd64.deb",
        version: "2.0.0",
        isPlaceholder: true, // Set to false after GitHub Release is created with this asset
      },
    ],
  },
};

/**
 * Detect the user's platform.
 */
export function detectPlatform(): 'macOS' | 'windows' | 'linux' | null {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('mac') && !userAgent.includes('iphone') && !userAgent.includes('ipad')) {
    return 'macOS';
  }
  if (userAgent.includes('win')) {
    return 'windows';
  }
  if (userAgent.includes('linux')) {
    return 'linux';
  }
  
  return null;
}

/**
 * Get the recommended download for the current platform.
 * Returns null if the platform cannot be detected or if the download is a placeholder.
 */
export function getRecommendedDownload(): PlatformDownload | null {
  const platform = detectPlatform();
  if (!platform) return null;
  
  const download = DOWNLOADS[platform]?.primary;
  // Only return if it's not a placeholder
  if (download?.isPlaceholder) return null;
  
  return download || null;
}

/**
 * Check if any downloads are currently live (not placeholders).
 * This determines whether the landing page shows "coming soon" or actual download buttons.
 */
export function areDownloadsLive(): boolean {
  for (const platform of Object.values(DOWNLOADS)) {
    if (!platform.primary.isPlaceholder) return true;
    if (platform.secondary?.some(d => !d.isPlaceholder)) return true;
  }
  return false;
}

/**
 * Get available downloads for a specific platform.
 * Returns only non-placeholder downloads.
 */
export function getAvailableDownloads(platform: 'macOS' | 'windows' | 'linux'): PlatformDownload[] {
  const config = DOWNLOADS[platform];
  if (!config) return [];
  
  const available: PlatformDownload[] = [];
  
  if (!config.primary.isPlaceholder) {
    available.push(config.primary);
  }
  
  config.secondary?.forEach(download => {
    if (!download.isPlaceholder) {
      available.push(download);
    }
  });
  
  return available;
}
