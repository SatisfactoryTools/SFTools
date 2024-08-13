import {Component, computed, ChangeDetectionStrategy} from '@angular/core';
import {CodexEntry} from '@src/Components/Codex/CodexEntry';
import {CodexEntryListComponent} from '@src/Components/Codex/CodexEntryListComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'codex-schematics',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './CodexSchematicsComponent.html',
	imports: [CodexLinkDirective, CodexEntryListComponent],
})
export class CodexSchematicsComponent
{

	protected readonly entries = computed<CodexEntry[]>(() =>
		[...(this.versionManager.activeVersionData()?.schematics ?? [])]
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(schematic => ({link: `schematics/${schematic.className}`, icons: [schematic.icon], name: schematic.name})),
	);

	public constructor(private readonly versionManager: VersionManager)
	{
	}

}
