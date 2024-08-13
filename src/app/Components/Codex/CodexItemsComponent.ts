import {Component, computed, ChangeDetectionStrategy} from '@angular/core';
import {CodexEntry} from '@src/Components/Codex/CodexEntry';
import {CodexEntryListComponent} from '@src/Components/Codex/CodexEntryListComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'codex-items',
	templateUrl: './CodexItemsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexLinkDirective, CodexEntryListComponent],
})
export class CodexItemsComponent
{

	protected readonly entries = computed<CodexEntry[]>(() =>
		[...(this.versionManager.activeVersionData()?.items ?? [])]
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(item => ({link: `items/${item.className}`, icons: [item.icon], name: item.name})),
	);

	public constructor(private readonly versionManager: VersionManager)
	{
	}

}
