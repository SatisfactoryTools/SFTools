use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
	version: String,
	current_version: String,
	notes: Option<String>,
	date: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct UpdateProgress {
	downloaded: usize,
	total: Option<u64>,
}

#[tauri::command]
pub async fn update_check(app: AppHandle, state: tauri::State<'_, AppState>) -> Result<Option<UpdateInfo>, String> {
	let update = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
	let info = update.as_ref().map(|update| UpdateInfo {
		version: update.version.clone(),
		current_version: update.current_version.clone(),
		notes: update.body.clone(),
		date: update.date.map(|date| date.to_string()),
	});
	*state.pending_update.lock().unwrap() = update;
	Ok(info)
}

#[tauri::command]
pub async fn update_install(app: AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
	let update = state.pending_update.lock().unwrap().take().ok_or("Check for updates first")?;
	let mut downloaded = 0usize;
	let progress_app = app.clone();
	update
		.download_and_install(
			move |chunk, total| {
				downloaded += chunk;
				let _ = progress_app.emit("update-progress", UpdateProgress { downloaded, total });
			},
			|| {},
		)
		.await
		.map_err(|e| e.to_string())?;
	app.restart();
}
