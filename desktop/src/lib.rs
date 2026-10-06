mod cache;
mod deep_links;
mod exports;
mod links;
mod state;
mod storage;
mod updates;

use serde::Serialize;
use std::collections::HashMap;
use tauri::webview::PageLoadEvent;
use tauri::{Manager, WebviewWindowBuilder};

use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct InitInfo {
	version: String,
	platform: &'static str,
	image_base: &'static str,
	data_dir: String,
	storage: HashMap<String, String>,
}

#[tauri::command]
fn desktop_init(app: tauri::AppHandle, state: tauri::State<'_, AppState>, api_url: String) -> Result<InitInfo, String> {
	state.set_api_url(api_url);
	let dir = storage::storage_dir(&app)?;
	Ok(InitInfo {
		version: app.package_info().version.to_string(),
		platform: platform(),
		image_base: cache::image_base(),
		data_dir: dir.to_string_lossy().into_owned(),
		storage: storage::read_all(&dir)?,
	})
}

fn platform() -> &'static str {
	if cfg!(windows) {
		"windows"
	} else if cfg!(target_os = "macos") {
		"macos"
	} else {
		"linux"
	}
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	let context = tauri::generate_context!();
	let version = context.package_info().version.to_string();
	tauri::Builder::default()
		// Must be the first plugin: a second launch (e.g. by an sftools:// link)
		// hands its arguments to the running instance and exits.
		.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
			deep_links::focus_main(app);
		}))
		.plugin(tauri_plugin_deep_link::init())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_updater::Builder::new().build())
		.manage(AppState::new(&version))
		.register_asynchronous_uri_scheme_protocol(cache::IMAGE_SCHEME, cache::serve_image)
		.invoke_handler(tauri::generate_handler![
			desktop_init,
			storage::storage_write,
			storage::storage_remove,
			storage::open_data_dir,
			cache::cache_get,
			cache::cache_put,
			cache::cache_has,
			cache::cache_prefetch_images,
			cache::cache_info,
			cache::cache_clear,
			links::open_external,
			exports::export_save,
			deep_links::deep_link_ready,
			deep_links::deep_link_set_enabled,
			updates::update_check,
			updates::update_install,
		])
		.setup(|app| {
			// Without a matching installed .desktop file (AppImage, dev build) Linux taskbars name the
			// app after its X11 window class, i.e. the binary name. GTK resets the class while it
			// initialises, so it is set here - after that, but before the window exists.
			let name = app.package_info().name.clone();
			#[cfg(target_os = "linux")]
			{
				gtk::glib::set_application_name(&name);
				gtk::gdk::set_program_class(&name);
			}
			let mut config = app
				.config()
				.app
				.windows
				.iter()
				.find(|window| window.label == "main")
				.cloned()
				.expect("the main window is defined in tauri.conf.json");
			config.title = name;
			let handle = app.handle().clone();
			let new_window_handle = app.handle().clone();
			WebviewWindowBuilder::from_config(app.handle(), &config)?
				.on_navigation(move |url| links::allow_navigation(&handle, url))
				.on_new_window(move |url, _features| links::deny_new_window(&new_window_handle, url))
				.on_page_load(|window, payload| {
					if payload.event() == PageLoadEvent::Started {
						deep_links::page_loading(window.app_handle());
					}
				})
				.build()?;
			deep_links::setup(app.handle());
			Ok(())
		})
		.run(context)
		.expect("error while running the Satisfactory Tools desktop app");
}

pub(crate) fn main_window(app: &tauri::AppHandle) -> Option<tauri::WebviewWindow> {
	app.get_webview_window("main")
}
