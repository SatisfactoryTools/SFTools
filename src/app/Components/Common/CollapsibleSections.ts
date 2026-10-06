import {CollapsedSectionsService} from '@src/Components/Common/CollapsedSectionsService';

export class CollapsibleSections
{

	public constructor(
		private readonly store: CollapsedSectionsService,
		private readonly namespace: string,
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

	public set(section: string, open: boolean): void
	{
		this.store.set(this.key(section), open);
	}

	public setMany(sections: readonly string[], open: boolean): void
	{
		this.store.setMany(sections.map(section => this.key(section)), open);
	}

	private key(section: string): string
	{
		return `${this.namespace}:${section}`;
	}

}
