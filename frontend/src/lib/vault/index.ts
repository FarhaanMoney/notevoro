import { BrowserVaultAdapter } from "@/lib/vault/browserAdapter";
import { TauriVaultAdapter, isTauri } from "@/lib/vault/tauriAdapter";
import type { VaultAdapter } from "@/lib/vault/types";

let adapter: VaultAdapter | null = null;

/**
 * Single place where the storage implementation is chosen. The UI and the domain
 * repositories never learn which one they got — that is the whole point.
 */
export function vault(): VaultAdapter {
  if (!adapter) adapter = isTauri() ? new TauriVaultAdapter() : new BrowserVaultAdapter();
  return adapter;
}

export const vaultKind = (): "browser" | "tauri" => (isTauri() ? "tauri" : "browser");

export type { VaultAdapter, VaultInfo } from "@/lib/vault/types";
