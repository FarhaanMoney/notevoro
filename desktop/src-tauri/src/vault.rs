//! Notevoro local vault. Rust owns filesystem access; the webview only gets these explicit commands.
//! Human-readable Markdown files are the source of truth. SQLite (`.notevoro/index.db`) is a rebuildable index.
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use walkdir::WalkDir;

#[derive(Default)]
pub struct VaultState {
    pub root: Mutex<Option<PathBuf>>,
}

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("no vault selected")]
    NoVault,
    #[error("path escapes vault")]
    Escape,
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
    #[error("db: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("walkdir: {0}")]
    WalkDir(#[from] walkdir::Error),
}

impl Serialize for VaultError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct VaultNote {
    pub path: String,
    pub title: String,
    pub modified: i64,
    pub size: u64,
}

#[derive(Serialize)]
pub struct VaultInfo {
    pub root: String,
    pub notes: usize,
    pub indexed_at: i64,
}

fn resolve(root: &Path, rel: &str) -> Result<PathBuf, VaultError> {
    let joined = root.join(rel);
    let canon_root = root.canonicalize()?;
    let parent = joined.parent().ok_or(VaultError::Escape)?;
    std::fs::create_dir_all(parent)?;
    let canon_parent = parent.canonicalize()?;
    if !canon_parent.starts_with(&canon_root) {
        return Err(VaultError::Escape);
    }
    Ok(joined)
}

fn db(root: &Path) -> Result<Connection, VaultError> {
    let dir = root.join(".notevoro");
    std::fs::create_dir_all(&dir)?;
    let conn = Connection::open(dir.join("index.db"))?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS notes (path TEXT PRIMARY KEY, title TEXT, modified INTEGER, size INTEGER, hash TEXT);
         CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(path UNINDEXED, title, body);
         CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);",
    )?;
    Ok(conn)
}

fn with_root<T>(state: &VaultState, f: impl FnOnce(&Path) -> Result<T, VaultError>) -> Result<T, VaultError> {
    let guard = state.root.lock().unwrap();
    let root = guard.as_ref().ok_or(VaultError::NoVault)?;
    f(root)
}

#[tauri::command]
pub fn vault_open(state: tauri::State<VaultState>, path: String) -> Result<VaultInfo, VaultError> {
    let root = PathBuf::from(&path);
    std::fs::create_dir_all(&root)?;
    *state.root.lock().unwrap() = Some(root.clone());
    vault_reindex(state)
}

#[tauri::command]
pub fn vault_reindex(state: tauri::State<VaultState>) -> Result<VaultInfo, VaultError> {
    with_root(&state, |root| {
        let conn = db(root)?;
        conn.execute_batch("DELETE FROM notes; DELETE FROM notes_fts;")?;
        let mut count = 0usize;
        for entry in WalkDir::new(root).into_iter().filter_map(Result::ok) {
            let p = entry.path();
            if p.extension().map(|e| e == "md").unwrap_or(false) && !p.starts_with(root.join(".notevoro")) {
                let rel = p.strip_prefix(root).unwrap().to_string_lossy().to_string();
                let body = std::fs::read_to_string(p).unwrap_or_default();
                let meta = entry.metadata()?;
                let modified = meta.modified()?.duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0);
                let title = body.lines().find(|l| l.starts_with('#')).map(|l| l.trim_start_matches('#').trim().to_string()).unwrap_or_else(|| p.file_stem().unwrap().to_string_lossy().to_string());
                let hash = format!("{:x}", Sha256::digest(body.as_bytes()));
                conn.execute("INSERT INTO notes VALUES (?1, ?2, ?3, ?4, ?5)", params![rel, title, modified, meta.len() as i64, hash])?;
                conn.execute("INSERT INTO notes_fts VALUES (?1, ?2, ?3)", params![rel, title, body])?;
                count += 1;
            }
        }
        let now = chrono::Utc::now().timestamp();
        conn.execute("INSERT OR REPLACE INTO meta VALUES ('indexed_at', ?1)", params![now.to_string()])?;
        Ok(VaultInfo { root: root.to_string_lossy().to_string(), notes: count, indexed_at: now })
    })
}

#[tauri::command]
pub fn vault_list(state: tauri::State<VaultState>) -> Result<Vec<VaultNote>, VaultError> {
    with_root(&state, |root| {
        let conn = db(root)?;
        let mut stmt = conn.prepare("SELECT path, title, modified, size FROM notes ORDER BY modified DESC")?;
        let rows = stmt.query_map([], |r| Ok(VaultNote { path: r.get(0)?, title: r.get(1)?, modified: r.get(2)?, size: r.get::<_, i64>(3)? as u64 }))?;
        Ok(rows.filter_map(Result::ok).collect())
    })
}

#[tauri::command]
pub fn vault_read(state: tauri::State<VaultState>, path: String) -> Result<String, VaultError> {
    with_root(&state, |root| Ok(std::fs::read_to_string(resolve(root, &path)?)?))
}

#[tauri::command]
pub fn vault_write(state: tauri::State<VaultState>, path: String, content: String) -> Result<VaultNote, VaultError> {
    with_root(&state, |root| {
        let full = resolve(root, &path)?;
        std::fs::write(&full, &content)?;
        let meta = std::fs::metadata(&full)?;
        let modified = chrono::Utc::now().timestamp();
        let title = content.lines().find(|l| l.starts_with('#')).map(|l| l.trim_start_matches('#').trim().to_string()).unwrap_or_else(|| path.clone());
        let conn = db(root)?;
        conn.execute("INSERT OR REPLACE INTO notes VALUES (?1, ?2, ?3, ?4, ?5)", params![path, title, modified, meta.len() as i64, format!("{:x}", Sha256::digest(content.as_bytes()))])?;
        conn.execute("DELETE FROM notes_fts WHERE path = ?1", params![path])?;
        conn.execute("INSERT INTO notes_fts VALUES (?1, ?2, ?3)", params![path, title, content])?;
        Ok(VaultNote { path, title, modified, size: meta.len() })
    })
}

#[tauri::command]
pub fn vault_delete(state: tauri::State<VaultState>, path: String) -> Result<(), VaultError> {
    with_root(&state, |root| {
        let full = resolve(root, &path)?;
        let trash = root.join(".notevoro").join("trash");
        std::fs::create_dir_all(&trash)?;
        std::fs::rename(&full, trash.join(format!("{}-{}", chrono::Utc::now().timestamp(), full.file_name().unwrap().to_string_lossy())))?;
        let conn = db(root)?;
        conn.execute("DELETE FROM notes WHERE path = ?1", params![path])?;
        conn.execute("DELETE FROM notes_fts WHERE path = ?1", params![path])?;
        Ok(())
    })
}

#[tauri::command]
pub fn vault_search(state: tauri::State<VaultState>, query: String) -> Result<Vec<VaultNote>, VaultError> {
    with_root(&state, |root| {
        let conn = db(root)?;
        let mut stmt = conn.prepare("SELECT n.path, n.title, n.modified, n.size FROM notes_fts f JOIN notes n ON n.path = f.path WHERE notes_fts MATCH ?1 ORDER BY rank LIMIT 50")?;
        let rows = stmt.query_map(params![query], |r| Ok(VaultNote { path: r.get(0)?, title: r.get(1)?, modified: r.get(2)?, size: r.get::<_, i64>(3)? as u64 }))?;
        Ok(rows.filter_map(Result::ok).collect())
    })
}
