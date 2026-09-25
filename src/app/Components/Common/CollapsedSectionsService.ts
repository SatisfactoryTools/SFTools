import {Injectable, signal} from '@angular/core';

/**
 * Which foldable sections the user has folded away, across every panel that
 * has them - the `<collapsible-card>`s of the calculator tabs and the side
 * panels, and the folders, plans and subplans of the plans tree. Panels and
 * calculator tabs are destroyed and rebuilt as the user moves around, so
 * their own fields would forget a fold the moment the tab changed - this
 * store outlives them and keeps the whole app consistent for as long as the
 * page is open.
 *
 * Deliberately not saved anywhere: it is a view preference for the current
 * session, not plan data and not an account setting.
 *
 * Keys are namespaced by panel; CollapsibleSections does that part, so call
 * sites only ever name their own sections.
 */
@Injectable({providedIn: 'root'})
export class CollapsedSectionsService
{

	/** Only the sections the user actually toggled - everything else follows its caller's default. */
	private readonly stateSignal = signal<ReadonlyMap<string, boolean>>(new Map());

	/** `defaultOpen` applies until the user folds or unfolds this section themselves. */
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

	/** Folds or unfolds several sections at once - one update, so one render. */
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
