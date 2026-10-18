use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::state::AppState;

const EXTENSION: &str = "sft";
const MAX_SIZE: u64 = 64 * 1024 * 1024;

#[derive(Clone, Serialize)]
pub struct OpenedFile {
	name: String,
	content: String,
}

/// Windows and Linux pass a double-clicked file as an argument, to the first launch or,
/// through the single-instance plugin, to the running one.
pub fn paths_from_args(args: &[String], cwd: &Path) -> Vec<PathBuf> {
	args.iter()
		.skip(1)
		.filter(|arg| !arg.starts_with('-') && !arg.contains("://"))
		.map(PathBuf::from)
		.map(|path| if path.is_absolute() { path } else { cwd.join(path) })
		.filter(|path| path.extension().is_some_and(|extension| extension.eq_ignore_ascii_case(EXTENSION)))
		.collect()
}

/// Read here rather than by path from the page, so the page never gets to read arbitrary files.
pub fn open(app: &AppHandle, paths: Vec<PathBuf>) {
	let files: Vec<OpenedFile> = paths.iter().filter_map(|path| read(path)).collect();
	if files.is_empty() {
		return;
	}
	let state = app.state::<AppState>();
	let mut queue = state.files.lock().unwrap();
	if queue.ready {
		for file in files {
			let _ = app.emit("open-file", file);
		}
	} else {
		queue.pending.extend(files);
	}
}

fn read(path: &Path) -> Option<OpenedFile> {
	let metadata = fs::metadata(path).ok()?;
	if !metadata.is_file() || metadata.len() > MAX_SIZE {
		eprintln!("Not opening {}: not a file or too large", path.display());
		return None;
	}
	let content = fs::read_to_string(path)
		.map_err(|error| eprintln!("Could not read {}: {error}", path.display()))
		.ok()?;
	let name = path.file_name()?.to_string_lossy().into_owned();
	Some(OpenedFile { name, content })
}

#[tauri::command]
pub fn opened_files_ready(state: tauri::State<'_, AppState>) -> Vec<OpenedFile> {
	let mut files = state.files.lock().unwrap();
	files.ready = true;
	std::mem::take(&mut files.pending)
}

pub fn page_loading(app: &AppHandle) {
	app.state::<AppState>().files.lock().unwrap().ready = false;
}
