mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(vault::VaultState::default())
        .invoke_handler(tauri::generate_handler![
            vault::vault_open,
            vault::vault_reindex,
            vault::vault_list,
            vault::vault_read,
            vault::vault_write,
            vault::vault_delete,
            vault::vault_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running Notevoro");
}
