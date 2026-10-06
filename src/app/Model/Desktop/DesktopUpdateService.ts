import {Injectable, NgZone, Optional, Signal, WritableSignal, signal} from '@angular/core';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {DesktopUpdateInfo} from '@src/Model/Desktop/DesktopUpdateInfo';

@Injectable({providedIn: 'root'})
export class DesktopUpdateService
{

	private readonly availableSignal: WritableSignal<DesktopUpdateInfo | null> = signal(null);
	public readonly available: Signal<DesktopUpdateInfo | null> = this.availableSignal.asReadonly();

	private readonly checkingSignal = signal(false);
	public readonly checking: Signal<boolean> = this.checkingSignal.asReadonly();

	private readonly upToDateSignal = signal(false);
	public readonly upToDate: Signal<boolean> = this.upToDateSignal.asReadonly();

	/** 0-1 while installing (null when the size is unknown), undefined otherwise. */
	private readonly progressSignal: WritableSignal<number | null | undefined> = signal(undefined);
	public readonly progress: Signal<number | null | undefined> = this.progressSignal.asReadonly();

	private readonly errorSignal: WritableSignal<string | null> = signal(null);
	public readonly error: Signal<string | null> = this.errorSignal.asReadonly();

	private readonly dismissedSignal = signal(false);
	public readonly dismissed: Signal<boolean> = this.dismissedSignal.asReadonly();

	public constructor(
		@Optional() private readonly desktop: DesktopBridge | null,
		private readonly zone: NgZone,
	)
	{
	}

	public get currentVersion(): string | null
	{
		return this.desktop?.info.version ?? null;
	}

	public check(): void
	{
		if (this.desktop === null || this.checkingSignal()) {
			return;
		}
		this.checkingSignal.set(true);
		this.errorSignal.set(null);
		this.upToDateSignal.set(false);
		this.desktop.invoke<DesktopUpdateInfo | null>('update_check').then(
			update => this.zone.run(() => {
				this.availableSignal.set(update);
				this.upToDateSignal.set(update === null);
				this.checkingSignal.set(false);
			}),
			error => this.zone.run(() => {
				console.error('Update check failed:', error);
				this.errorSignal.set('Could not check for updates.');
				this.checkingSignal.set(false);
			}),
		);
	}

	public install(): void
	{
		if (this.desktop === null || this.availableSignal() === null || this.progressSignal() !== undefined) {
			return;
		}
		this.errorSignal.set(null);
		this.progressSignal.set(null);
		const desktop = this.desktop;
		void desktop.listen<{downloaded: number; total: number | null}>('update-progress', ({downloaded, total}) => this.zone.run(() => {
			this.progressSignal.set(total ? downloaded / total : null);
		})).then(stop => desktop.invoke('update_install').then(
			// The app restarts once it is installed; getting here means it did not.
			() => stop(),
			error => this.zone.run(() => {
				stop();
				console.error('Update failed:', error);
				this.errorSignal.set('The update could not be installed. Please try again.');
				this.progressSignal.set(undefined);
			}),
		));
	}

	public dismiss(): void
	{
		this.dismissedSignal.set(true);
	}

}
