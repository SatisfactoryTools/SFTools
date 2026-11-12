import {Injectable, Signal, signal} from '@angular/core';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const STORAGE_KEY = 'sftools.planner.layoutLocked';

/** Per device, not an account setting: it is mostly wanted on a touch device and would get in the way on the desktop. */
@Injectable({providedIn: 'root'})
export class GraphLayoutLockService
{

	private readonly lockedSignal = signal(false);
	public readonly locked: Signal<boolean> = this.lockedSignal.asReadonly();

	public constructor(private readonly storage: AppStorage)
	{
		this.lockedSignal.set(storage.getItem(STORAGE_KEY) === '1');
	}

	public toggle(): void
	{
		const locked = !this.lockedSignal();
		this.lockedSignal.set(locked);
		if (locked) {
			this.storage.setItem(STORAGE_KEY, '1');
		} else {
			this.storage.removeItem(STORAGE_KEY);
		}
	}

}
