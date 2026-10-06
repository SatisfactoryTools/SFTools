import {Injectable, Optional, Signal, WritableSignal, signal} from '@angular/core';
import {AppLinks} from '@src/Model/Desktop/AppLinks';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const STORAGE_KEY = 'sftools.openLinksInDesktop';
const STAY_PARAM = 'web';

@Injectable({providedIn: 'root'})
export class WebLinkHandoffService
{

	private readonly enabledSignal: WritableSignal<boolean>;
	public readonly enabled: Signal<boolean>;

	private readonly pendingSignal: WritableSignal<string | null>;
	public readonly pending: Signal<string | null>;

	public readonly available: boolean;

	public constructor(
		private readonly storage: AppStorage,
		@Optional() desktop: DesktopBridge | null,
	)
	{
		this.available = desktop === null;
		this.enabledSignal = signal(this.available && storage.getItem(STORAGE_KEY) === '1');
		this.enabled = this.enabledSignal.asReadonly();
		this.pendingSignal = signal(this.initialHandoff());
		this.pending = this.pendingSignal.asReadonly();
	}

	public setEnabled(enabled: boolean): void
	{
		this.enabledSignal.set(enabled);
		if (enabled) {
			this.storage.setItem(STORAGE_KEY, '1');
		} else {
			this.storage.removeItem(STORAGE_KEY);
		}
	}

	public openInApp(): void
	{
		const link = this.pendingSignal();
		if (link !== null) {
			window.location.href = link;
		}
	}

	public stayHere(): void
	{
		this.pendingSignal.set(null);
	}

	private initialHandoff(): string | null
	{
		const {pathname, search, hash} = window.location;
		const params = new URLSearchParams(search);
		if (!this.enabledSignal() || params.has(STAY_PARAM) || !AppLinks.isHandoffPath(pathname)) {
			return null;
		}
		return AppLinks.desktopUrl(pathname + search + hash);
	}

}
