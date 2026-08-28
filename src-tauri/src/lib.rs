//! Notevoro vault backend.
//!
//! The vault is a folder of Markdown files on the user's own drive and is the single
//! source of truth. SQLite is only a rebuildable search/metadata index — deleting
//! `.notevoro/index.sqlite` must never lose data, it just triggers a reindex.
//!
//! Commands exposed to the frontend (see frontend/src/lib/vault/tauriAdapter.ts):
//!   vault_select, vault_info, vault_list, vault_read, vault_write, vault_remove,
//!   vault_watch, vault_search, vault_reindex

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use notify::{RecursiveMode, Watcher};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use walkdir::WalkDir;

const VAULT_POINTER: &str = "vault_path.txt";
const INDEX_DIR: &str = ".notevoro";
const INDEX_FILE: &str = "index.sqlite";

#[derive(Default)]
struct VaultState {
    root: Mutex<Option<PathBuf>>,
    watching: Mutex<bool>,
}

#[derive(Serialize)]
struct VaultInfo {
    path: String,
    writable: bool,
    watching: bool,
}

#[derive(Serialize, Deserialize)]
struct SearchHit {
    path: String,
    title: String,
    snippet: String,
}

/* ------------------------------- vault pointer ------------------------------ */

fn pointer_file(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join(VAULT_POINTER))
}

fn remember_vault(app: &AppHandle, root: &Path) {
    if let Some(file) = pointer_file(app) {
        if let Some(parent) = file.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(file, root.to_string_lossy().as_bytes());
    }
}

fn restore_vault(app: &AppHandle) -> Option<PathBuf> {
    let file = pointer_file(app)?;
    let raw = fs::read_to_string(file).ok()?;
    let path = PathBuf::from(raw.trim());
    path.is_dir().then_some(path)
}

/// Default vault so a first run is never a blank wall: ~/Notevoro
fn default_vault() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Notevoro")
}

fn current_root(state: &State<VaultState>) -> Result<PathBuf, String> {
    state
        .root
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or_else(|| "No vault selected yet".to_string())
}

/// Refuse any path that escapes the vault (`..`, absolute paths, symlink tricks).
fn resolve(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let candidate = root.join(relative);
    let normalized = candidate
        .components()
        .filter(|c| !matches!(c, std::path::Component::CurDir))
        .fold(PathBuf::new(), |mut acc, c| {
            match c {
                std::path::Component::ParentDir => {
                    acc.pop();
                }
                other => acc.push(other.as_os_str()),
            }
            acc
        });
    if !normalized.starts_with(root) {
        return Err("Path escapes the vault".into());
    }
    Ok(normalized)
}

/* ---------------------------------- commands -------------------------------- */

#[tauri::command]
async fn vault_select(app: AppHandle, state: State<'_, VaultState>) -> Result<VaultInfo, String> {
    let picked = app
        .dialog()
        .file()
        .set_title("Choose your Notevoro Vault folder")
        .blocking_pick_folder()
        .ok_or_else(|| "No folder chosen".to_string())?;

    let root = PathBuf::from(picked.to_string());
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    remember_vault(&app, &root);
    *state.root.lock().map_err(|e| e.to_string())? = Some(root.clone());
    reindex_vault(&root)?;

    Ok(VaultInfo {
        path: root.to_string_lossy().to_string(),
        writable: true,
        watching: *state.watching.lock().map_err(|e| e.to_string())?,
    })
}

#[tauri::command]
fn vault_info(state: State<'_, VaultState>) -> Result<VaultInfo, String> {
    let root = current_root(&state)?;
    let writable = fs::metadata(&root).map(|m| !m.permissions().readonly()).unwrap_or(false);
    Ok(VaultInfo {
        path: root.to_string_lossy().to_string(),
        writable,
        watching: *state.watching.lock().map_err(|e| e.to_string())?,
    })
}

#[tauri::command]
fn vault_list(dir: String, state: State<'_, VaultState>) -> Result<Vec<String>, String> {
    let root = current_root(&state)?;
    let start = resolve(&root, &dir)?;
    if !start.exists() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    for entry in WalkDir::new(&start).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        // Never surface the index database as vault content.
        if entry.path().components().any(|c| c.as_os_str() == INDEX_DIR) {
            continue;
        }
        if let Ok(rel) = entry.path().strip_prefix(&root) {
            out.push(rel.to_string_lossy().replace('\\', "/"));
        }
    }
    Ok(out)
}

#[tauri::command]
fn vault_read(path: String, state: State<'_, VaultState>) -> Result<Option<String>, String> {
    let root = current_root(&state)?;
    let file = resolve(&root, &path)?;
    match fs::read_to_string(file) {
        Ok(content) => Ok(Some(content)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn vault_write(path: String, content: String, state: State<'_, VaultState>) -> Result<(), String> {
    let root = current_root(&state)?;
    let file = resolve(&root, &path)?;
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&file, content.as_bytes()).map_err(|e| e.to_string())?;
    index_file(&root, &path, &content)?;
    Ok(())
}

#[tauri::command]
fn vault_remove(path: String, state: State<'_, VaultState>) -> Result<(), String> {
    let root = current_root(&state)?;
    let file = resolve(&root, &path)?;
    if file.exists() {
        fs::remove_file(file).map_err(|e| e.to_string())?;
    }
    if let Ok(conn) = open_index(&root) {
        let _ = conn.execute("DELETE FROM notes WHERE path = ?1", [&path]);
    }
    Ok(())
}

/// Watch the vault so edits made in Obsidian, VS Code or `git pull` appear immediately.
#[tauri::command]
fn vault_watch(app: AppHandle, state: State<'_, VaultState>) -> Result<(), String> {
    if *state.watching.lock().map_err(|e| e.to_string())? {
        return Ok(());
    }
    let root = current_root(&state)?;
    *state.watching.lock().map_err(|e| e.to_string())? = true;

    thread::spawn(move || {
        let (tx, rx) = channel();
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(_) => return,
        };
        if watcher.watch(&root, RecursiveMode::Recursive).is_err() {
            return;
        }
        // Coalesce bursts (editors write several times per save).
        loop {
            match rx.recv() {
                Ok(_) => {
                    while rx.recv_timeout(Duration::from_millis(250)).is_ok() {}
                    let _ = reindex_vault(&root);
                    let _ = app.emit("vault://changed", ());
                }
                Err(_) => break,
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn vault_search(query: String, state: State<'_, VaultState>) -> Result<Vec<SearchHit>, String> {
    let root = current_root(&state)?;
    let conn = open_index(&root)?;
    let mut stmt = conn
        .prepare(
            "SELECT path, title, substr(body, 1, 240) FROM notes
             WHERE title LIKE ?1 OR body LIKE ?1 ORDER BY updated DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let needle = format!("%{}%", query);
    let rows = stmt
        .query_map([needle], |row| {
            Ok(SearchHit {
                path: row.get(0)?,
                title: row.get(1)?,
                snippet: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(Result::ok).collect())
}

#[tauri::command]
fn vault_reindex(state: State<'_, VaultState>) -> Result<usize, String> {
    let root = current_root(&state)?;
    reindex_vault(&root)
}

/* ----------------------------- SQLite search index --------------------------- */
/* Rebuildable cache only. The Markdown files remain authoritative.               */

fn open_index(root: &Path) -> Result<Connection, String> {
    let dir = root.join(INDEX_DIR);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let conn = Connection::open(dir.join(INDEX_FILE)).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            path TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '',
            body TEXT NOT NULL DEFAULT '',
            space TEXT,
            kind TEXT,
            updated TEXT
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

/// Minimal frontmatter reader — mirrors frontend/src/lib/vault/markdown.ts.
fn frontmatter_value(content: &str, key: &str) -> Option<String> {
    if !content.starts_with("---") {
        return None;
    }
    let end = content[3..].find("\n---").map(|i| i + 3)?;
    content[3..end].lines().find_map(|line| {
        let (k, v) = line.split_once(':')?;
        (k.trim() == key).then(|| v.trim().trim_matches('"').to_string())
    })
}

fn index_file(root: &Path, path: &str, content: &str) -> Result<(), String> {
    let conn = open_index(root)?;
    conn.execute(
        "INSERT INTO notes (path, title, body, space, kind, updated)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(path) DO UPDATE SET
            title=excluded.title, body=excluded.body,
            space=excluded.space, kind=excluded.kind, updated=excluded.updated",
        rusqlite::params![
            path,
            frontmatter_value(content, "title").unwrap_or_default(),
            content,
            frontmatter_value(content, "space"),
            frontmatter_value(content, "type"),
            frontmatter_value(content, "updated")
                .or_else(|| frontmatter_value(content, "created"))
                .unwrap_or_default(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn reindex_vault(root: &Path) -> Result<usize, String> {
    let conn = open_index(root)?;
    conn.execute("DELETE FROM notes", []).map_err(|e| e.to_string())?;
    let mut count = 0usize;
    for entry in WalkDir::new(root).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        if entry.path().components().any(|c| c.as_os_str() == INDEX_DIR) {
            continue;
        }
        if entry.path().extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        if let (Ok(rel), Ok(content)) = (
            entry.path().strip_prefix(root),
            fs::read_to_string(entry.path()),
        ) {
            let rel = rel.to_string_lossy().replace('\\', "/");
            index_file(root, &rel, &content)?;
            count += 1;
        }
    }
    Ok(count)
}

/* ------------------------------------ run ----------------------------------- */

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(VaultState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            // Reopen the last vault, or create the default one on first launch.
            let root = restore_vault(&handle).unwrap_or_else(default_vault);
            let _ = fs::create_dir_all(&root);
            let _ = reindex_vault(&root);
            remember_vault(&handle, &root);
            let state = app.state::<VaultState>();
            if let Ok(mut guard) = state.root.lock() {
                *guard = Some(root);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            vault_select,
            vault_info,
            vault_list,
            vault_read,
            vault_write,
            vault_remove,
            vault_watch,
            vault_search,
            vault_reindex
        ])
        .run(tauri::generate_context!())
        .expect("error while running Notevoro");
}
