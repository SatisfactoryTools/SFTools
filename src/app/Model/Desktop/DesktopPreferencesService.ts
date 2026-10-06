import {Injectable, Signal, WritableSignal, signal} from '@angular/core';
import {DesktopPreferences} from '@src/Model/Desktop/DesktopPreferences';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const STORAGE_KEY = 'sftools.desktop.preferences';

const DEFAULTS: DesktopPreferences = {openLinks: true, checkForUpdates: true};

@Injectable({providedIn: 'root'})
export class DesktopPreferencesService
{

	private readonly preferencesSignal: WritableSignal<DesktopPreferences>;
	public readonly preferences: Signal<DesktopPreferences>;

	public constructor(private readonly storage: AppStorage)
	{
		this.preferencesSignal = signal(this.load());
		this.preferences = this.preferencesSignal.asReadonly();
	}

	public update(patch: Partial<DesktopPreferences>): void
	{
		const preferences = {...this.preferencesSignal(), ...patch};
		this.preferencesSignal.set(preferences);
		this.storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
	}

	private load(): DesktopPreferences
	{
		try {
			return {...DEFAULTS, ...JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '{}') as Partial<DesktopPreferences>};
		} catch {
			return DEFAULTS;
		}
	}

}
