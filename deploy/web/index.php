<?php declare(strict_types = 1);

/**
 * Not part of the Angular build: CI copies deploy/web/ into dist/ and .htaccess falls back to plain
 * index.html when this file is absent. Any failure here must serve the generic tags, never a broken page.
 */

final class PageHeadInjector
{

	private const DEFAULT_API_URL = 'https://api.new.satisfactorytools.com';

	/** Search engines index this host only; the others redirect to it. */
	private const CANONICAL_ORIGIN = 'https://www.satisfactorytools.com';

	private const DEFAULT_IMAGE_PATH = '/assets/icons/android-chrome-512x512.png';
	private const PATH_MAX_LENGTH = 512;
	private const CONNECT_TIMEOUT_MS = 300;
	private const TIMEOUT_MS = 800;

	/** Long enough for the API to redeem the code with the provider; the page waits for it, but only on this one URL. */
	private const OAUTH_PREFETCH_TIMEOUT_MS = 4000;

	/** Old-site URLs; a day's browser cache bounds the damage should a target ever change. */
	private const REDIRECT_MAX_AGE = 86400;

	public function run(): void
	{
		$this->prefetchOAuth((string) ($_SERVER['REQUEST_URI'] ?? '/'));

		$path = substr((string) ($_SERVER['REQUEST_URI'] ?? '/'), 0, self::PATH_MAX_LENGTH);
		$meta = $this->fetchMeta($path);

		if ($meta !== null && $meta['redirect'] !== null) {
			header('Location: ' . $meta['redirect'], true, 301);
			header('Cache-Control: public, max-age=' . self::REDIRECT_MAX_AGE);
			return;
		}

		header('Content-Type: text/html; charset=utf-8');
		header('Cache-Control: no-cache, no-store, must-revalidate');
		header('Pragma: no-cache');
		header('Expires: 0');
		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') {
			return;
		}

		$documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
		$root = is_string($documentRoot) && is_file($documentRoot . '/index.html') ? $documentRoot : __DIR__;
		$html = (string) file_get_contents($root . '/index.html');

		echo $this->inject($html, $meta ?? $this->defaultsFrom($html), $path);
	}

	/**
	 * A provider's sign-in code is single-use and expires within minutes, while the app that would send it can take
	 * longer than that to load on a slow connection. So the API redeems it now; the app's callback picks up the result.
	 */
	private function prefetchOAuth(string $uri): void
	{
		if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET' || !function_exists('curl_init')) {
			return;
		}
		if (preg_match('~^/auth/callback/([a-z0-9-]{1,32})\?(.+)$~D', $uri, $match) !== 1) {
			return;
		}

		$params = $this->queryParams($match[2]);
		if (!isset($params['state'])) {
			return;
		}

		$curl = curl_init($this->apiUrl() . '/v1/auth/oauth/' . $match[1] . '/prefetch');
		curl_setopt_array($curl, [
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_POST => true,
			CURLOPT_POSTFIELDS => (string) json_encode(['params' => $params]),
			CURLOPT_CONNECTTIMEOUT_MS => self::CONNECT_TIMEOUT_MS,
			CURLOPT_TIMEOUT_MS => self::OAUTH_PREFETCH_TIMEOUT_MS,
			CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
		]);
		curl_exec($curl);
	}

	/**
	 * Decoded the way the app's router decodes them ("+" is a space, the first of repeated keys wins), so the API can
	 * match the two. Not parse_str(): it turns the dots in Steam's openid.* keys into underscores.
	 * @return array<string, string>
	 */
	private function queryParams(string $query): array
	{
		$params = [];
		foreach (explode('&', explode('#', $query, 2)[0]) as $pair) {
			if ($pair === '') {
				continue;
			}
			[$key, $value] = array_pad(explode('=', $pair, 2), 2, '');
			$key = urldecode($key);
			if (!array_key_exists($key, $params)) {
				$params[$key] = urldecode($value);
			}
		}

		return $params;
	}

	private function apiUrl(): string
	{
		$configured = $_SERVER['SFTOOLS_API_URL'] ?? $_SERVER['REDIRECT_SFTOOLS_API_URL'] ?? getenv('SFTOOLS_API_URL');

		return rtrim(is_string($configured) && $configured !== '' ? $configured : self::DEFAULT_API_URL, '/');
	}

	/**
	 * @return array{
	 *     title: string, description: string, image: string|null, kind: string, heading: string|null, canonicalPath: string|null,
	 *     indexable: bool, links: list<array{href: string, label: string}>, redirect: string|null, resolved: bool
	 * }|null
	 */
	private function fetchMeta(string $path): ?array
	{
		$url = $this->apiUrl() . '/v1/meta?path=' . rawurlencode($path);

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

		$links = [];
		foreach (is_array($meta['links'] ?? null) ? $meta['links'] : [] as $link) {
			if (is_array($link) && $this->isLocalPath($link['href'] ?? null) && is_string($link['label'] ?? null)) {
				$links[] = ['href' => $link['href'], 'label' => $link['label']];
			}
		}

		return [
			'title' => $meta['title'],
			'description' => $meta['description'],
			'image' => is_string($meta['image'] ?? null) ? $meta['image'] : null,
			'kind' => is_string($meta['kind'] ?? null) ? $meta['kind'] : 'default',
			'heading' => is_string($meta['heading'] ?? null) ? $meta['heading'] : null,
			'canonicalPath' => $this->isLocalPath($meta['canonicalPath'] ?? null) ? $meta['canonicalPath'] : null,
			'indexable' => ($meta['indexable'] ?? true) !== false,
			'links' => $links,
			'redirect' => $this->isLocalPath($meta['redirect'] ?? null) ? $meta['redirect'] : null,
			'resolved' => true,
		];
	}

	private function isLocalPath(mixed $path): bool
	{
		return is_string($path) && preg_match('~^/(?![/\\\\])[^\s]*$~D', $path) === 1;
	}

	/** Without the API nothing is known about the page, so it gets neither a canonical link nor noindex. */
	private function defaultsFrom(string $html): array
	{
		$title = preg_match('~<title>(.*?)</title>~is', $html, $match) === 1 ? $match[1] : 'Satisfactory Tools';
		$description = preg_match('~<meta\s+name="description"\s+content="([^"]*)"~i', $html, $match) === 1 ? $match[1] : '';

		return [
			'title' => html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
			'description' => html_entity_decode($description, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
			'image' => null,
			'kind' => 'default',
			'heading' => null,
			'canonicalPath' => null,
			'indexable' => true,
			'links' => [],
			'redirect' => null,
			'resolved' => false,
		];
	}

	/**
	 * @param array{
	 *     title: string, description: string, image: string|null, kind: string, heading: string|null, canonicalPath: string|null,
	 *     indexable: bool, links: list<array{href: string, label: string}>, redirect: string|null, resolved: bool
	 * } $meta
	 */
	private function inject(string $html, array $meta, string $path): string
	{
		$image = $meta['image'] ?? self::CANONICAL_ORIGIN . self::DEFAULT_IMAGE_PATH;
		$tags = [
			'<title>' . $this->escape($meta['title']) . '</title>',
			$this->tag('name', 'description', $meta['description']),
		];
		if ($meta['canonicalPath'] !== null) {
			$tags[] = sprintf('<link rel="canonical" href="%s">', $this->escape(self::CANONICAL_ORIGIN . $meta['canonicalPath']));
		}
		if (!$meta['indexable']) {
			$tags[] = $this->tag('name', 'robots', 'noindex');
		}
		array_push(
			$tags,
			$this->tag('property', 'og:type', $meta['kind'] === 'help-article' ? 'article' : 'website'),
			$this->tag('property', 'og:site_name', 'Satisfactory Tools'),
			$this->tag('property', 'og:url', self::CANONICAL_ORIGIN . ($meta['canonicalPath'] ?? $this->canonicalPath($path))),
			$this->tag('property', 'og:title', $meta['title']),
			$this->tag('property', 'og:description', $meta['description']),
			$this->tag('property', 'og:image', $image),
			// "summary": icons and the logo are small squares that a large card would stretch.
			$this->tag('name', 'twitter:card', 'summary'),
			$this->tag('name', 'twitter:title', $meta['title']),
			$this->tag('name', 'twitter:description', $meta['description']),
			$this->tag('name', 'twitter:image', $image),
		);

		// Matched by tag rather than by markers: the Angular build may rewrite comments and line breaks.
		$html = (string) preg_replace('~[ \t]*<title>.*?</title>[ \t]*(?:\r?\n)?~is', '', $html);
		$html = (string) preg_replace('~[ \t]*<meta\s+(?:name|property)="(?:description|robots|og:[^"]*|twitter:[^"]*)"[^>]*>[ \t]*(?:\r?\n)?~i', '', $html);
		$html = (string) preg_replace('~[ \t]*<link\s+rel="canonical"[^>]*>[ \t]*(?:\r?\n)?~i', '', $html);

		$block = "\n\t" . implode("\n\t", $tags);
		$count = 0;
		$html = (string) preg_replace('~<meta\s+charset="[^"]*"\s*/?>~i', '$0' . str_replace(['\\', '$'], ['\\\\', '\\$'], $block), $html, 1, $count);
		if ($count === 0) {
			$html = (string) preg_replace('~<head[^>]*>~i', '$0' . str_replace(['\\', '$'], ['\\\\', '\\$'], $block), $html, 1);
		}

		if ($meta['resolved'] && $meta['indexable']) {
			$body = $this->pageSummary($meta);
			$html = (string) preg_replace_callback('~<root>\s*</root>~i', static fn (): string => '<root>' . $body . '</root>', $html, 1);
		}

		return $html;
	}

	/**
	 * The page's heading, summary and links for crawlers that do not run scripts. Angular replaces it when it
	 * starts; it must say what the app shows, or search engines treat it as cloaking.
	 *
	 * @param array{title: string, description: string, heading: string|null, links: list<array{href: string, label: string}>} $meta
	 */
	private function pageSummary(array $meta): string
	{
		$heading = $meta['heading'] ?? (string) preg_replace('~ - Satisfactory Tools$~', '', $meta['title']);
		$links = array_map(
			fn (array $link): string => sprintf('<li><a href="%s">%s</a></li>', $this->escape($link['href']), $this->escape($link['label'])),
			$meta['links'],
		);

		return '<div class="boot-page"><h1>' . $this->escape($heading) . '</h1><p>' . $this->escape($meta['description']) . '</p>'
			. ($links !== [] ? '<nav><ul>' . implode('', $links) . '</ul></nav>' : '')
			. '</div>';
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
