import type { VaultAdapter, VaultInfo } from "@/lib/vault/types";

/**
 * Tauri 2 adapter — the production path.
 *
 * Talks to the Rust commands in `src-tauri/src/lib.rs` over Tauri's IPC. It intentionally
 * uses the runtime-injected `__TAURI_INTERNALS__.invoke` rather than importing
 * `@tauri-apps/api`, so the web bundle carries no desktop-only dependency and this file
 * compiles and ships in both targets.
 *
 * Rust owns: secure folder selection, read/write/delete, recursive listing, filesystem
 * watching, and the rebuildable SQLite search index.
 */

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

interface TauriInternals {
  invoke: Invoke;
}

interface TauriEventApi {
  listen: (event: string, handler: () => void) => Promise<() => void>;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals;
    __TAURI__?: { event?: TauriEventApi };
  }
}

export const isTauri = (): boolean =>
  typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);

const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const internals = window.__TAURI_INTERNALS__;
  if (!internals) throw new Error("Tauri runtime is not available");
  return (await internals.invoke(cmd, args)) as T;
};

export class TauriVaultAdapter implements VaultAdapter {
  async info(): Promise<VaultInfo> {
    const info = await invoke<{ path: string; writable: boolean; watching: boolean }>(
      "vault_info",
    );
    return {
      kind: "tauri",
      label: "Local Notevoro Vault",
      path: info.path,
      writable: info.writable,
      watching: info.watching,
    };
  }

  list(dir: string): Promise<string[]> {
    return invoke<string[]>("vault_list", { dir });
  }

  read(path: string): Promise<string | null> {
    return invoke<string | null>("vault_read", { path });
  }

  write(path: string, content: string): Promise<void> {
    return invoke<void>("vault_write", { path, content });
  }

  remove(path: string): Promise<void> {
    return invoke<void>("vault_remove", { path });
  }

  async selectVault(): Promise<VaultInfo | null> {
    const picked = await invoke<{ path: string } | null>("vault_select");
    return picked ? await this.info() : null;
  }

  async watch(onChange: () => void): Promise<() => void> {
    await invoke<void>("vault_watch");
    const listen = window.__TAURI__?.event?.listen;
    if (!listen) return () => {};
    return await listen("vault://changed", onChange);
  }
}
