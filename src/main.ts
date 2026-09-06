import { provideZoneChangeDetection } from "@angular/core";
import {bootstrapApplication} from '@angular/platform-browser';
import {RootComponent} from '@src/Components/Root/RootComponent';
import {config} from './config';

bootstrapApplication(RootComponent, {...config, providers: [provideZoneChangeDetection(), ...config.providers]})
	.catch((err) => {
		console.error(err);
		// index.html listens for this and replaces the blank page with an error screen.
		document.dispatchEvent(new CustomEvent('sftools:boot-failed', {detail: err}));
	});
