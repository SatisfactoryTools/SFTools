use futures::stream::{self, StreamExt};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::http::{header, Request, Response, StatusCode};
use tauri::{Emitter, Manager, UriSchemeContext, UriSchemeResponder};

use crate::state::AppState;
use crate::storage::write_atomic;

pub const IMAGE_SCHEME: &str = "sfimg";

const PREFETCH_CONCURRENCY: usize = 8;

pub fn image_base() -> &'static str {
	// WebView2 and Android only reach custom schemes through http://{scheme}.localhost.
	if cfg!(windows) {
		"http://sfimg.localhost"
	} else {
		"sfimg://localhost"
	}
}

fn cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
	Ok(app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("sftools-cache"))
}

fn response_path(app: &tauri::AppHandle, key: &str) -> Result<PathBuf, String> {
	let hash = Sha256::digest(key.as_bytes());
	let name: String = hash.iter().map(|byte| format!("{byte:02x}")).collect();
	Ok(cache_dir(app)?.join("responses").join(format!("{name}.json")))
}

fn image_path(app: &tauri::AppHandle, reference: &str) -> Option<PathBuf> {
	let (size, hash) = reference.trim_start_matches('/').trim_end_matches(".png").split_once('/')?;
	let valid_size = size == "64" || size == "256";
	let valid_hash = !hash.is_empty() && hash.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-');
	if !valid_size || !valid_hash {
		return None;
	}
	Some(cache_dir(app).ok()?.join("images").join(size).join(format!("{hash}.png")))
}

fn image_url(state: &AppState, reference: &str) -> Option<String> {
	Some(format!("{}/data/images/{}.png", state.api_url()?, reference.trim_start_matches('/').trim_end_matches(".png")))
}

async fn download_image(state: &AppState, url: &str, path: &Path) -> Result<bool, String> {
	let response = state.http.get(url).send().await.map_err(|e| format!("{e:?}"))?;
	if response.status() == reqwest::StatusCode::NOT_FOUND {
		return Ok(false);
	}
	if !response.status().is_success() {
		return Err(format!("HTTP {}", response.status()));
	}
	let bytes = response.bytes().await.map_err(|e| e.to_string())?;
	write_atomic(path, &bytes)?;
	Ok(true)
}

pub fn serve_image(ctx: UriSchemeContext<'_, tauri::Wry>, request: Request<Vec<u8>>, responder: UriSchemeResponder) {
	let app = ctx.app_handle().clone();
	let reference = request.uri().path().to_string();
	tauri::async_runtime::spawn(async move {
		responder.respond(image_response(&app, &reference).await);
	});
}

async fn image_response(app: &tauri::AppHandle, reference: &str) -> Response<Vec<u8>> {
	let not_found = || Response::builder().status(StatusCode::NOT_FOUND).body(Vec::new()).unwrap();
	let Some(mut path) = image_path(app, reference) else {
		return not_found();
	};
	if !path.exists() {
		let state = app.state::<AppState>();
		let Some(url) = image_url(&state, reference) else {
			return not_found();
		};
		let downloaded = download_image(&state, &url, &path).await;
		if let Err(error) = &downloaded {
			eprintln!("Could not download {url}: {error}");
		}
		if !matches!(downloaded, Ok(true)) {
			// Offline downloads only fetch the small size; a blurry icon beats a missing one.
			match image_path(app, &reference.replacen("/256/", "/64/", 1)) {
				Some(small) if reference.starts_with("/256/") && small.exists() => path = small,
				_ => return not_found(),
			}
		}
	}
	match fs::read(&path) {
		Ok(bytes) => Response::builder()
			.header(header::CONTENT_TYPE, "image/png")
			.header(header::CACHE_CONTROL, "max-age=31536000, immutable")
			.header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
			.body(bytes)
			.unwrap(),
		Err(_) => not_found(),
	}
}

#[tauri::command]
pub async fn cache_get(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
	match fs::read_to_string(response_path(&app, &key)?) {
		Ok(body) => Ok(Some(body)),
		Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
		Err(error) => Err(error.to_string()),
	}
}

#[tauri::command]
pub async fn cache_put(app: tauri::AppHandle, key: String, body: String) -> Result<(), String> {
	let path = response_path(&app, &key)?;
	// Version data files run to megabytes and are re-fetched on every visit;
	// most of the time they are already cached byte for byte.
	if fs::read(&path).map(|existing| existing == body.as_bytes()).unwrap_or(false) {
		return Ok(());
	}
	write_atomic(&path, body.as_bytes())
}

#[tauri::command]
pub async fn cache_has(app: tauri::AppHandle, keys: Vec<String>) -> Result<Vec<bool>, String> {
	keys.iter().map(|key| Ok(response_path(&app, key)?.exists())).collect()
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PrefetchProgress {
	job: String,
	done: usize,
	total: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrefetchResult {
	total: usize,
	downloaded: usize,
	failed: usize,
}

#[tauri::command]
pub async fn cache_prefetch_images(app: tauri::AppHandle, job: String, images: Vec<String>) -> Result<PrefetchResult, String> {
	let missing: Vec<(String, PathBuf)> = images
		.iter()
		.filter_map(|reference| image_path(&app, reference).map(|path| (reference.clone(), path)))
		.filter(|(_, path)| !path.exists())
		.collect();
	let total = missing.len();
	let mut downloaded = 0;
	let mut failed = 0;
	let mut done = 0;
	let _ = app.emit("cache-progress", PrefetchProgress { job: job.clone(), done, total });

	let state = app.state::<AppState>();
	let mut results = stream::iter(missing)
		.map(|(reference, path)| {
			let state = &state;
			async move {
				let Some(url) = image_url(state, &reference) else {
					return Err("The API URL is not configured".to_string());
				};
				download_image(state, &url, &path).await
			}
		})
		.buffer_unordered(PREFETCH_CONCURRENCY);
	while let Some(result) = results.next().await {
		match result {
			// An icon the server does not have is not worth retrying.
			Ok(_) => downloaded += 1,
			Err(error) => {
				eprintln!("Could not download an icon: {error}");
				failed += 1;
			}
		}
		done += 1;
		if done % 20 == 0 || done == total {
			let _ = app.emit("cache-progress", PrefetchProgress { job: job.clone(), done, total });
		}
	}
	Ok(PrefetchResult { total, downloaded, failed })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheInfo {
	bytes: u64,
	path: String,
}

fn dir_size(path: &Path) -> u64 {
	fs::read_dir(path)
		.map(|entries| {
			entries
				.filter_map(Result::ok)
				.map(|entry| {
					let path = entry.path();
					if path.is_dir() {
						dir_size(&path)
					} else {
						entry.metadata().map(|meta| meta.len()).unwrap_or(0)
					}
				})
				.sum()
		})
		.unwrap_or(0)
}

#[tauri::command]
pub async fn cache_info(app: tauri::AppHandle) -> Result<CacheInfo, String> {
	let dir = cache_dir(&app)?;
	Ok(CacheInfo { bytes: dir_size(&dir), path: dir.to_string_lossy().into_owned() })
}

#[tauri::command]
pub async fn cache_clear(app: tauri::AppHandle) -> Result<(), String> {
	let dir = cache_dir(&app)?;
	match fs::remove_dir_all(&dir) {
		Ok(()) => Ok(()),
		Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
		Err(error) => Err(error.to_string()),
	}
}
