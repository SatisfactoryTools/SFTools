import {Component, ChangeDetectionStrategy, Input, computed, effect} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPuzzlePiece, faXmark} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {ModFilterOption} from '@src/Components/Mods/ModFilterOption';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {ModFilter} from '@src/Model/Mods/ModFilter';

@Component({
	selector: 'mod-filter',
	templateUrl: './ModFilterComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, BsDropdownModule, AppTooltipDirective],
	styles: `
		:host {
			display: inline-flex;
			flex: none;
		}
		.mod-filter-menu {
			min-width: 14rem;
			max-width: min(20rem, calc(100vw - 2rem));
			max-height: min(60vh, 420px);
			overflow-y: auto;
		}
		.mod-filter-menu label {
			cursor: pointer;
			white-space: normal;
		}
	`,
})
export class ModFilterComponent
{

	public readonly faPuzzlePiece = faPuzzlePiece;
	public readonly faXmark = faXmark;

	@Input({required: true}) public filter!: ModFilter;

	public readonly options = computed<ModFilterOption[]>(() => {
		const mods = this.versionManager.activeVersionData()?.mods ?? [];
		if (mods.length === 0) {
			return [];
		}
		return [
			{key: ModFilter.VANILLA, name: 'Vanilla'},
			...[...mods].sort((a, b) => a.name.localeCompare(b.name)).map(mod => ({key: mod.id, name: mod.name})),
		];
	});

	public constructor(private readonly versionManager: VersionManager)
	{
		// Another version has other mods, and a filter on mods it lacks would hide everything.
		effect(() => {
			const keys = this.options().map(option => option.key);
			this.filter?.retain(keys);
		});
	}

	public get label(): string
	{
		const selected = this.options().filter(option => this.filter.isSelected(option.key));
		if (selected.length === 0) {
			return 'All mods';
		}
		return selected.length === 1 ? selected[0].name : `${selected.length} selected`;
	}

}
