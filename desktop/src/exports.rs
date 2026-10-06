use std::fs;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

use crate::storage::write_atomic;

fn safe_file_name(name: &str) -> String {
	let cleaned: String = name
		.chars()
		.map(|c| if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') || c.is_control() { ' ' } else { c })
		.collect();
	let trimmed = cleaned.trim().trim_start_matches('.').trim();
	if trimmed.is_empty() { "export".to_string() } else { trimmed.to_string() }
}

fn unique_path(dir: &Path, file_name: &str) -> PathBuf {
	let path = dir.join(file_name);
	if !path.exists() {
		return path;
	}
	let (stem, extension) = match file_name.rsplit_once('.') {
		Some((stem, extension)) if !stem.is_empty() => (stem, format!(".{extension}")),
		_ => (file_name, String::new()),
	};
	(2..)
		.map(|n| dir.join(format!("{stem} ({n}){extension}")))
		.find(|candidate| !candidate.exists())
		.expect("unbounded range")
}

/// Raw bytes in the body so a PNG is not re-encoded on the way; the name travels
/// percent-encoded in the `x-file-name` header.
#[tauri::command]
pub fn export_save(app: tauri::AppHandle, request: Request<'_>) -> Result<String, String> {
	let encoded = request
		.headers()
		.get("x-file-name")
		.and_then(|value| value.to_str().ok())
		.ok_or("Missing file name")?;
	let name = url::form_urlencoded::parse(format!("n={encoded}").as_bytes())
		.find(|(key, _)| key == "n")
		.map(|(_, value)| value.into_owned())
		.unwrap_or_default();
	let bytes: &[u8] = match request.body() {
		InvokeBody::Raw(bytes) => bytes,
		InvokeBody::Json(_) => return Err("Expected a binary body".to_string()),
	};
	let dir = app.path().download_dir().map_err(|e| e.to_string())?;
	fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
	let path = unique_path(&dir, &safe_file_name(&name));
	write_atomic(&path, bytes)?;
	let shown = path.to_string_lossy().into_owned();
	if let Err(error) = app.opener().open_path(&shown, None::<&str>) {
		eprintln!("Could not open {shown}: {error}");
	}
	Ok(shown)
}
