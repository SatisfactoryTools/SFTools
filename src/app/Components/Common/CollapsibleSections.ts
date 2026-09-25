import {CollapsedSectionsService} from '@src/Components/Common/CollapsedSectionsService';

/**
 * One panel's view on the shared fold state: the panel names its sections,
 * this prefixes them so two panels can both have a "Settings" card without
 * sharing a fold. Components build one in their constructor and bind to it
 * from the template - `[open]="foldState.isOpen('graph')"`. Sections are
 * usually `<collapsible-card>`s, but anything named and foldable fits - the
 * plans tree folds its folders and plans by id through one of these.
 */
export class CollapsibleSections
{

	public constructor(
		private readonly store: CollapsedSectionsService,
		private readonly namespace: string,
		/** Whether the panel's sections start open; a section may override it. */
		private readonly defaultOpen: boolean = true,
	)
	{
	}

	public isOpen(section: string, defaultOpen: boolean = this.defaultOpen): boolean
	{
		return this.store.isOpen(this.key(section), defaultOpen);
	}

	public toggle(section: string, defaultOpen: boolean = this.defaultOpen): void
	{
		this.store.toggle(this.key(section), defaultOpen);
	}

	/** Folds or unfolds a section outright, for the rare case the panel decides rather than the user. */
	public set(section: string, open: boolean): void
	{
		this.store.set(this.key(section), open);
	}

	/** The "expand all" / "collapse all" of a whole group of sections. */
	public setMany(sections: readonly string[], open: boolean): void
	{
		this.store.setMany(sections.map(section => this.key(section)), open);
	}

	private key(section: string): string
	{
		return `${this.namespace}:${section}`;
	}

}
