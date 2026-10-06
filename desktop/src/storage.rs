use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

pub fn storage_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
	let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("sftools-data");
	fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
	Ok(dir)
}

pub fn read_all(dir: &Path) -> Result<HashMap<String, String>, String> {
	let mut files = HashMap::new();
	read_into(dir, "", &mut files)?;
	Ok(files)
}

fn read_into(dir: &Path, prefix: &str, files: &mut HashMap<String, String>) -> Result<(), String> {
	for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
		let entry = entry.map_err(|e| e.to_string())?;
		let name = entry.file_name().to_string_lossy().into_owned();
		let path = entry.path();
		if path.is_dir() {
			if prefix.is_empty() {
				read_into(&path, &format!("{name}/"), files)?;
			}
			continue;
		}
		if !name.ends_with(".json") {
			continue;
		}
		match fs::read_to_string(&path) {
			Ok(contents) => {
				files.insert(format!("{prefix}{name}"), contents);
			}
			Err(error) => eprintln!("Could not read {}: {error}", path.display()),
		}
	}
	Ok(())
}

/// The name comes from the webview and must not reach outside the folder.
fn resolve(dir: &Path, name: &str) -> Result<PathBuf, String> {
	let segments: Vec<&str> = name.split('/').collect();
	let valid = !segments.is_empty()
		&& segments.len() <= 2
		&& name.ends_with(".json")
		&& segments.iter().all(|segment| {
			!segment.is_empty()
				&& !segment.starts_with('.')
				&& segment.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
		});
	if !valid {
		return Err(format!("Invalid storage file name: {name}"));
	}
	Ok(segments.iter().fold(dir.to_path_buf(), |path, segment| path.join(segment)))
}

/// Temp file + rename, so a crash mid-write leaves the previous version. Each write has
/// its own temp file: two writes of one file must not rename each other's.
pub fn write_atomic(path: &Path, contents: &[u8]) -> Result<(), String> {
	static COUNTER: AtomicU64 = AtomicU64::new(0);
	if let Some(parent) = path.parent() {
		fs::create_dir_all(parent).map_err(|e| e.to_string())?;
	}
	let temp = path.with_extension(format!("{}.{}.tmp", std::process::id(), COUNTER.fetch_add(1, Ordering::Relaxed)));
	let result = fs::File::create(&temp)
		.and_then(|mut file| {
			std::io::Write::write_all(&mut file, contents)?;
			file.sync_all()
		})
		.and_then(|()| fs::rename(&temp, path));
	if result.is_err() {
		let _ = fs::remove_file(&temp);
	}
	result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn storage_write(app: tauri::AppHandle, name: String, contents: String) -> Result<(), String> {
	let path = resolve(&storage_dir(&app)?, &name)?;
	write_atomic(&path, contents.as_bytes())
}

#[tauri::command]
pub async fn storage_remove(app: tauri::AppHandle, name: String) -> Result<(), String> {
	let path = resolve(&storage_dir(&app)?, &name)?;
	match fs::remove_file(&path) {
		Ok(()) => Ok(()),
		Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
		Err(error) => Err(error.to_string()),
	}
}

#[tauri::command]
pub fn open_data_dir(app: tauri::AppHandle) -> Result<(), String> {
	let dir = storage_dir(&app)?;
	app.opener().open_path(dir.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
}
