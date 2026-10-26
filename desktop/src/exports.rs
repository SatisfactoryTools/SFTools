use std::fs;
use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

use crate::storage::write_atomic;

/// Whatever runs in the webview can call this command, so it may only ever write the app's own export
/// formats, never an executable or a script.
const ALLOWED_EXTENSIONS: [&str; 3] = ["png", "svg", "sft"];

/// Only a PNG is opened: an SVG (it can carry scripts) and an .sft are just shown in their folder.
const OPENED_EXTENSIONS: [&str; 1] = ["png"];

fn extension_of(file_name: &str) -> Option<String> {
	file_name.rsplit_once('.').map(|(_, extension)| extension.to_ascii_lowercase())
}

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
	let file_name = safe_file_name(&name);
	let extension = extension_of(&file_name).unwrap_or_default();
	if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
		return Err(format!("Files of type .{extension} cannot be exported"));
	}
	let dir = app.path().download_dir().map_err(|e| e.to_string())?;
	fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
	let path = unique_path(&dir, &file_name);
	write_atomic(&path, bytes)?;
	let shown = path.to_string_lossy().into_owned();
	// Plan exports are only revealed: this app opens .sft files, so opening one would import it straight back.
	let reveal = request.headers().get("x-after-save").and_then(|value| value.to_str().ok()) == Some("reveal")
		|| !OPENED_EXTENSIONS.contains(&extension.as_str());
	let result = if reveal { app.opener().reveal_item_in_dir(&path) } else { app.opener().open_path(&shown, None::<&str>) };
	if let Err(error) = result {
		eprintln!("Could not open {shown}: {error}");
	}
	Ok(shown)
}
