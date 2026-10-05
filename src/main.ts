import { provideZoneChangeDetection } from "@angular/core";
import {bootstrapApplication} from '@angular/platform-browser';
import {env} from '@env/env';
import {RootComponent} from '@src/Components/Root/RootComponent';
import {HandoffReceiver} from '@src/Model/Handoff/HandoffReceiver';
import {config} from './config';

// The beta origin's browser data has to be in localStorage before the
// services read it in their constructors - so it is fetched first, once.
new HandoffReceiver(env.handoffSourceOrigin)
	.run()
	.then(() => bootstrapApplication(RootComponent, {...config, providers: [provideZoneChangeDetection(), ...config.providers]}))
	.catch((err) => {
		console.error(err);
		// index.html listens for this and replaces the blank page with an error screen.
		document.dispatchEvent(new CustomEvent('sftools:boot-failed', {detail: err}));
	});
