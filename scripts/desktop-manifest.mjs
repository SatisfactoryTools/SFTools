// Renaming the bundles is safe: the signatures cover the file contents, not the names.

import {copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {basename, join} from 'node:path';

const [version, bundleDir, outDir, baseUrl, notes = ''] = process.argv.slice(2);
if (!version || !bundleDir || !outDir || !baseUrl) {
	console.error('usage: node scripts/desktop-manifest.mjs <version> <bundle dir> <out dir> <download base URL> [notes]');
	process.exit(1);
}

const PLATFORMS = [
	{keys: ['windows-x86_64'], match: name => name.endsWith('-setup.exe'), rename: `satisfactory-tools-${version}-windows-x64-setup.exe`},
	{keys: ['linux-x86_64'], match: name => name.endsWith('.AppImage'), rename: `satisfactory-tools-${version}-linux-x86_64.AppImage`},
	// The updater looks up `{os}-{arch}-{installer}` before `{os}-{arch}`, so a package install updates with its own format.
	{keys: ['linux-x86_64-deb'], match: name => name.endsWith('.deb'), rename: `satisfactory-tools-${version}-linux-amd64.deb`},
	{keys: ['linux-x86_64-rpm'], match: name => name.endsWith('.rpm'), rename: `satisfactory-tools-${version}-linux-x86_64.rpm`},
	// One universal build serves both macOS architectures.
	{keys: ['darwin-aarch64', 'darwin-x86_64'], match: name => name.endsWith('.app.tar.gz'), rename: `satisfactory-tools-${version}-macos-universal.app.tar.gz`},
	// The website's macOS download; the updater never asks for this key.
	{keys: ['darwin-universal-dmg'], match: name => name.endsWith('.dmg'), rename: `satisfactory-tools-${version}-macos-universal.dmg`},
];

function files(dir)
{
	return readdirSync(dir).flatMap(name => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : [path];
	});
}

const all = files(bundleDir);
const target = join(outDir, version);
mkdirSync(target, {recursive: true});

const platforms = {};
for (const platform of PLATFORMS) {
	const bundle = all.find(path => platform.match(basename(path)));
	if (bundle === undefined) {
		console.warn(`No ${platform.keys.join('/')} bundle found - left out of the manifest.`);
		continue;
	}
	const signature = all.find(path => path === `${bundle}.sig`);
	if (signature === undefined) {
		throw new Error(`${bundle} has no .sig next to it - was TAURI_SIGNING_PRIVATE_KEY set?`);
	}
	copyFileSync(bundle, join(target, platform.rename));
	copyFileSync(signature, join(target, `${platform.rename}.sig`));
	for (const key of platform.keys) {
		platforms[key] = {
			signature: readFileSync(signature, 'utf8').trim(),
			url: `${baseUrl.replace(/\/+$/, '')}/${version}/${platform.rename}`,
			size: statSync(bundle).size,
		};
	}
	console.log(`${platform.keys.join(', ')}: ${platform.rename}`);
}

if (Object.keys(platforms).length === 0) {
	throw new Error('No bundles found.');
}

const manifest = {version, notes, pub_date: new Date().toISOString(), platforms};
writeFileSync(join(outDir, 'latest.json'), JSON.stringify(manifest, null, '\t') + '\n');
console.log(`latest.json written for ${version}.`);
