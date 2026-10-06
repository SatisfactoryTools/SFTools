use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

use crate::main_window;
use crate::state::AppState;

pub const SCHEME: &str = "sftools";

pub fn setup(app: &AppHandle) {
	if let Ok(Some(urls)) = app.deep_link().get_current() {
		queue(app, urls.iter().map(|url| url.to_string()).collect());
	}
	let handle = app.clone();
	app.deep_link().on_open_url(move |event| {
		queue(&handle, event.urls().iter().map(|url| url.to_string()).collect());
		focus_main(&handle);
	});
}

fn queue(app: &AppHandle, urls: Vec<String>) {
	let state = app.state::<AppState>();
	let urls: Vec<String> = urls.into_iter().filter(|url| url.starts_with(&format!("{SCHEME}:"))).collect();
	if urls.is_empty() {
		return;
	}
	// One lock for both, so a link cannot slip between "not ready" and the
	// frontend taking the queue.
	let mut links = state.links.lock().unwrap();
	if links.ready {
		for url in urls {
			let _ = app.emit("deep-link", url);
		}
	} else {
		links.pending.extend(urls);
	}
}

pub fn focus_main(app: &AppHandle) {
	if let Some(window) = main_window(app) {
		let _ = window.unminimize();
		let _ = window.show();
		let _ = window.set_focus();
	}
}

#[tauri::command]
pub fn deep_link_ready(state: tauri::State<'_, AppState>) -> Vec<String> {
	let mut links = state.links.lock().unwrap();
	links.ready = true;
	std::mem::take(&mut links.pending)
}

pub fn page_loading(app: &AppHandle) {
	app.state::<AppState>().links.lock().unwrap().ready = false;
}

/// The Windows installer registers it too; re-registering on every start keeps an
/// AppImage, whose path changes with every update, reachable.
#[tauri::command]
pub fn deep_link_set_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
	#[cfg(any(windows, target_os = "linux"))]
	{
		let result = if enabled {
			app.deep_link().register(SCHEME)
		} else {
			app.deep_link().unregister(SCHEME)
		};
		result.map_err(|e| e.to_string())
	}
	#[cfg(not(any(windows, target_os = "linux")))]
	{
		let _ = (app, enabled);
		Ok(())
	}
}
