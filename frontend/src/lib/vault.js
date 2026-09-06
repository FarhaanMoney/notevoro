/* Local vault bridge. Only active inside the Tauri desktop shell; the browser build reports isDesktop=false. */
export const isDesktop = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

async function invoke(cmd, args) {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke(cmd, args);
}

export const vault = {
  open: (path) => invoke('vault_open', { path }),
  reindex: () => invoke('vault_reindex'),
  list: () => invoke('vault_list'),
  read: (path) => invoke('vault_read', { path }),
  write: (path, content) => invoke('vault_write', { path, content }),
  remove: (path) => invoke('vault_delete', { path }),
  search: (query) => invoke('vault_search', { query }),
};
