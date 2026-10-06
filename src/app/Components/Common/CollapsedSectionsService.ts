import {Injectable, signal} from '@angular/core';

/** Outlives the panels and tabs, which are destroyed as the user moves around. Deliberately not persisted: a session view preference, not plan data or an account setting. */
@Injectable({providedIn: 'root'})
export class CollapsedSectionsService
{

	private readonly stateSignal = signal<ReadonlyMap<string, boolean>>(new Map());

	public isOpen(key: string, defaultOpen: boolean): boolean
	{
		return this.stateSignal().get(key) ?? defaultOpen;
	}

	public toggle(key: string, defaultOpen: boolean): void
	{
		this.set(key, !this.isOpen(key, defaultOpen));
	}

	public set(key: string, open: boolean): void
	{
		this.setMany([key], open);
	}

	public setMany(keys: readonly string[], open: boolean): void
	{
		if (keys.length === 0) {
			return;
		}
		this.stateSignal.update(state => {
			const next = new Map(state);
			keys.forEach(key => next.set(key, open));
			return next;
		});
	}

}
