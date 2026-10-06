use tauri::webview::NewWindowResponse;
use tauri::Url;
use tauri_plugin_opener::OpenerExt;

fn is_app_url(url: &Url) -> bool {
	match url.scheme() {
		"tauri" | "sfimg" => true,
		"http" | "https" => match url.host_str() {
			Some("tauri.localhost") | Some("sfimg.localhost") => true,
			Some("localhost") => cfg!(debug_assertions),
			_ => false,
		},
		"about" | "blob" | "data" => true,
		_ => false,
	}
}

fn is_external(url: &Url) -> bool {
	matches!(url.scheme(), "http" | "https" | "mailto")
}

fn open(app: &tauri::AppHandle, url: &Url) {
	if is_external(url) {
		if let Err(error) = app.opener().open_url(url.as_str(), None::<&str>) {
			eprintln!("Could not open {url}: {error}");
		}
	}
}

pub fn allow_navigation(app: &tauri::AppHandle, url: &Url) -> bool {
	if is_app_url(url) {
		return true;
	}
	open(app, url);
	false
}

pub fn deny_new_window(app: &tauri::AppHandle, url: Url) -> NewWindowResponse<tauri::Wry> {
	open(app, &url);
	NewWindowResponse::Deny
}

#[tauri::command]
pub fn open_external(app: tauri::AppHandle, url: String) -> Result<(), String> {
	let parsed = Url::parse(&url).map_err(|e| e.to_string())?;
	if !is_external(&parsed) {
		return Err(format!("Not an external link: {url}"));
	}
	app.opener().open_url(parsed.as_str(), None::<&str>).map_err(|e| e.to_string())
}
