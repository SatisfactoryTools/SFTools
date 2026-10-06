import { provideZoneChangeDetection } from "@angular/core";
import {bootstrapApplication} from '@angular/platform-browser';
import {env} from '@env/env';
import {RootComponent} from '@src/Components/Root/RootComponent';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {AppStorage} from '@src/Model/Storage/AppStorage';
import {BrowserAppStorage} from '@src/Model/Storage/BrowserAppStorage';
import {FileAppStorage} from '@src/Model/Storage/FileAppStorage';
import {config} from './config';

// Old hashbang links (/#!/1.0/production?share=…): the fragment never reaches the router, so it becomes the real path before the legacy matcher sees it.
if (window.location.hash.startsWith('#!/')) {
	window.history.replaceState(null, '', window.location.hash.substring(2));
}

// The desktop app's files are read in one go before the services read storage in their constructors.
DesktopBridge.connect(env.apiUrl)
	.then(desktop => {
		const storage: AppStorage = desktop === null ? new BrowserAppStorage() : new FileAppStorage(desktop);
		const platformProviders = [
			{provide: AppStorage, useValue: storage},
			...(desktop === null ? [] : [{provide: DesktopBridge, useValue: desktop}]),
		];
		return bootstrapApplication(RootComponent, {...config, providers: [provideZoneChangeDetection(), ...platformProviders, ...config.providers]});
	})
	.catch((err) => {
		console.error(err);
		// index.html listens for this and replaces the blank page with an error screen.
		document.dispatchEvent(new CustomEvent('sftools:boot-failed', {detail: err}));
	});
