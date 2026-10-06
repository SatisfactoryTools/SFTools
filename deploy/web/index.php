<?php declare(strict_types = 1);

/**
 * Not part of the Angular build: CI copies deploy/web/ into dist/ and .htaccess falls back to plain
 * index.html when this file is absent. Any failure here must serve the generic tags, never a broken page.
 */

final class PageHeadInjector
{

	private const DEFAULT_API_URL = 'https://api.new.satisfactorytools.com';

	/** Hosts og:url may name; anything else (an IP, a spoofed Host header) gets the first. */
	private const PUBLIC_HOSTS = ['new.satisfactorytools.com', 'www.satisfactorytools.com', 'satisfactorytools.com'];

	private const DEFAULT_IMAGE_PATH = '/assets/icons/android-chrome-512x512.png';
	private const PATH_MAX_LENGTH = 512;
	private const CONNECT_TIMEOUT_MS = 300;
	private const TIMEOUT_MS = 800;

	public function run(): void
	{
		header('Content-Type: text/html; charset=utf-8');
		header('Cache-Control: no-cache, no-store, must-revalidate');
		header('Pragma: no-cache');
		header('Expires: 0');
		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') {
			return;
		}

		$html = (string) file_get_contents(__DIR__ . '/index.html');
		$path = substr((string) ($_SERVER['REQUEST_URI'] ?? '/'), 0, self::PATH_MAX_LENGTH);
		$host = $this->publicHost();

		$meta = $this->fetchMeta($path) ?? $this->defaultsFrom($html);
		echo $this->inject($html, $meta, $host, $path);
	}

	/** @return array{title: string, description: string, image: string|null, kind: string}|null */
	private function fetchMeta(string $path): ?array
	{
		$configured = $_SERVER['SFTOOLS_API_URL'] ?? $_SERVER['REDIRECT_SFTOOLS_API_URL'] ?? getenv('SFTOOLS_API_URL');
		$apiUrl = rtrim(is_string($configured) && $configured !== '' ? $configured : self::DEFAULT_API_URL, '/');
		$url = $apiUrl . '/v1/meta?path=' . rawurlencode($path);

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
		$meta = json_decode($body, true);
		if (!is_array($meta) || !is_string($meta['title'] ?? null) || !is_string($meta['description'] ?? null)) {
			return null;
		}

		return [
			'title' => $meta['title'],
			'description' => $meta['description'],
			'image' => is_string($meta['image'] ?? null) ? $meta['image'] : null,
			'kind' => is_string($meta['kind'] ?? null) ? $meta['kind'] : 'default',
		];
	}

	/** @return array{title: string, description: string, image: null, kind: string} */
	private function defaultsFrom(string $html): array
	{
		$title = preg_match('~<title>(.*?)</title>~is', $html, $match) === 1 ? $match[1] : 'Satisfactory Tools';
		$description = preg_match('~<meta\s+name="description"\s+content="([^"]*)"~i', $html, $match) === 1 ? $match[1] : '';

		return [
			'title' => html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
			'description' => html_entity_decode($description, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
			'image' => null,
			'kind' => 'default',
		];
	}

	/** @param array{title: string, description: string, image: string|null, kind: string} $meta */
	private function inject(string $html, array $meta, string $host, string $path): string
	{
		$image = $meta['image'] ?? 'https://' . $host . self::DEFAULT_IMAGE_PATH;
		$tags = [
			'<title>' . $this->escape($meta['title']) . '</title>',
			$this->tag('name', 'description', $meta['description']),
			$this->tag('property', 'og:type', $meta['kind'] === 'help-article' ? 'article' : 'website'),
			$this->tag('property', 'og:site_name', 'Satisfactory Tools'),
			$this->tag('property', 'og:url', 'https://' . $host . $this->canonicalPath($path)),
			$this->tag('property', 'og:title', $meta['title']),
			$this->tag('property', 'og:description', $meta['description']),
			$this->tag('property', 'og:image', $image),
			// "summary": icons and the logo are small squares that a large card would stretch.
			$this->tag('name', 'twitter:card', 'summary'),
			$this->tag('name', 'twitter:title', $meta['title']),
			$this->tag('name', 'twitter:description', $meta['description']),
			$this->tag('name', 'twitter:image', $image),
		];

		// Matched by tag rather than by markers: the Angular build may rewrite comments and line breaks.
		$html = (string) preg_replace('~[ \t]*<title>.*?</title>[ \t]*(?:\r?\n)?~is', '', $html);
		$html = (string) preg_replace('~[ \t]*<meta\s+(?:name|property)="(?:description|og:[^"]*|twitter:[^"]*)"[^>]*>[ \t]*(?:\r?\n)?~i', '', $html);

		$block = "\n\t" . implode("\n\t", $tags);
		$count = 0;
		$html = (string) preg_replace('~<meta\s+charset="[^"]*"\s*/?>~i', '$0' . str_replace(['\\', '$'], ['\\\\', '\\$'], $block), $html, 1, $count);
		if ($count === 0) {
			$html = (string) preg_replace('~<head[^>]*>~i', '$0' . str_replace(['\\', '$'], ['\\\\', '\\$'], $block), $html, 1);
		}

		return $html;
	}

	private function publicHost(): string
	{
		$host = strtolower((string) preg_replace('~:\d+$~', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));

		return in_array($host, self::PUBLIC_HOSTS, true) ? $host : self::PUBLIC_HOSTS[0];
	}

	/** A planner's ?codex= stays: it picks the page. */
	private function canonicalPath(string $path): string
	{
		[$pathPart, $query] = array_pad(explode('?', explode('#', $path, 2)[0], 2), 2, '');
		parse_str($query, $params);

		return is_string($params['codex'] ?? null) && $params['codex'] !== ''
			? $pathPart . '?codex=' . rawurlencode($params['codex'])
			: $pathPart;
	}

	private function tag(string $attribute, string $name, string $content): string
	{
		return sprintf('<meta %s="%s" content="%s">', $attribute, $name, $this->escape($content));
	}

	private function escape(string $value): string
	{
		return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
	}

}

// Local testing with PHP's built-in server: existing files are served as is.
if (PHP_SAPI === 'cli-server' && is_file(__DIR__ . parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH))) {
	return false;
}

(new PageHeadInjector())->run();
