import {Component, computed, ChangeDetectionStrategy} from '@angular/core';
import {CodexEntry} from '@src/Components/Codex/CodexEntry';
import {CodexEntryListComponent} from '@src/Components/Codex/CodexEntryListComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'codex-buildings',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './CodexBuildingsComponent.html',
	imports: [CodexLinkDirective, CodexEntryListComponent],
})
export class CodexBuildingsComponent
{

	protected readonly entries = computed<CodexEntry[]>(() =>
		[...(this.versionManager.activeVersionData()?.buildings ?? [])]
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(building => ({link: `buildings/${building.className}`, icons: [building.icon], name: building.name})),
	);

	public constructor(private readonly versionManager: VersionManager)
	{
	}

}
