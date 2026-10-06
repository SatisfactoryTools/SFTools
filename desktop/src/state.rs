use std::sync::Mutex;
use std::time::Duration;
use tauri_plugin_updater::Update;

#[derive(Default)]
pub struct LinkQueue {
	pub ready: bool,
	pub pending: Vec<String>,
}

pub struct AppState {
	/// Set by the frontend on start - the API URL lives in its environment file.
	api_url: Mutex<Option<String>>,
	pub http: reqwest::Client,
	pub pending_update: Mutex<Option<Update>>,
	pub links: Mutex<LinkQueue>,
}

impl Default for AppState {
	fn default() -> Self {
		Self {
			api_url: Mutex::new(None),
			http: reqwest::Client::builder()
				.connect_timeout(Duration::from_secs(10))
				.timeout(Duration::from_secs(60))
				.user_agent(concat!("SatisfactoryToolsDesktop/", env!("CARGO_PKG_VERSION")))
				.build()
				.expect("the HTTP client builds"),
			pending_update: Mutex::new(None),
			links: Mutex::new(LinkQueue::default()),
		}
	}
}

impl AppState {
	pub fn set_api_url(&self, url: String) {
		*self.api_url.lock().unwrap() = Some(url.trim_end_matches('/').to_string());
	}

	pub fn api_url(&self) -> Option<String> {
		self.api_url.lock().unwrap().clone()
	}
}
