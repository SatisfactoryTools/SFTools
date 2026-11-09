<?php declare(strict_types = 1);

/** Served as /sitemap.xml (.htaccess). The page list comes from the API, which knows the versions and help articles. */

final class SitemapRenderer
{

	private const DEFAULT_API_URL = 'https://api.new.satisfactorytools.com';
	private const CANONICAL_ORIGIN = 'https://www.satisfactorytools.com';
	private const CONNECT_TIMEOUT_MS = 1000;
	private const TIMEOUT_MS = 5000;
	private const MAX_AGE = 3600;

	public function run(): void
	{
		$paths = $this->fetchPaths();
		if ($paths === null) {
			// A crawler retries a 503 later; an empty sitemap would read as "these pages are gone".
			http_response_code(503);
			header('Retry-After: ' . self::MAX_AGE);
			header('Content-Type: text/plain; charset=utf-8');
			echo "Sitemap temporarily unavailable.\n";
			return;
		}

		header('Content-Type: application/xml; charset=utf-8');
		header('Cache-Control: public, max-age=' . self::MAX_AGE);
		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') {
			return;
		}

		echo '<?xml version="1.0" encoding="UTF-8"?>', "\n";
		echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', "\n";
		foreach ($paths as $path) {
			echo "\t<url><loc>", htmlspecialchars(self::CANONICAL_ORIGIN . $path, ENT_XML1 | ENT_QUOTES, 'UTF-8'), "</loc></url>\n";
		}
		echo "</urlset>\n";
	}

	/** @return list<string>|null */
	private function fetchPaths(): ?array
	{
		$configured = $_SERVER['SFTOOLS_API_URL'] ?? $_SERVER['REDIRECT_SFTOOLS_API_URL'] ?? getenv('SFTOOLS_API_URL');
		$apiUrl = rtrim(is_string($configured) && $configured !== '' ? $configured : self::DEFAULT_API_URL, '/');
		$url = $apiUrl . '/v1/meta/sitemap';

		if (function_exists('curl_init')) {
			$curl = curl_init($url);
			curl_setopt_array($curl, [
				CURLOPT_RETURNTRANSFER => true,
				CURLOPT_CONNECTTIMEOUT_MS => self::CONNECT_TIMEOUT_MS,
				CURLOPT_TIMEOUT_MS => self::TIMEOUT_MS,
				CURLOPT_HTTPHEADER => ['Accept: application/json'],
			]);
			$body = curl_exec($curl);
			$status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
		} else {
			$context = stream_context_create(['http' => ['timeout' => self::TIMEOUT_MS / 1000, 'ignore_errors' => true]]);
			$body = @file_get_contents($url, false, $context);
			$status = isset($http_response_header[0]) && preg_match('~^HTTP/\S+\s+(\d+)~', $http_response_header[0], $match) === 1 ? (int) $match[1] : 0;
		}

		if ($status !== 200 || !is_string($body)) {
			return null;
		}
		$data = json_decode($body, true);
		if (!is_array($data) || !is_array($data['paths'] ?? null) || $data['paths'] === []) {
			return null;
		}

		$paths = [];
		foreach ($data['paths'] as $path) {
			if (is_string($path) && preg_match('~^/(?![/\\\\])\S*$~D', $path) === 1) {
				$paths[] = $path;
			}
		}

		return $paths;
	}

}

(new SitemapRenderer())->run();
