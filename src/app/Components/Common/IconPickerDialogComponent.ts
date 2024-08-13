import {Component, EventEmitter, Output, ChangeDetectionStrategy, computed} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {VersionManager} from '@src/Model/Data/VersionManager';

/**
 * Modal for choosing any item or building icon. Emits the chosen class name on
 * `pick` and `close` on dismissal (backdrop click, ✕, or Escape). Self-contained
 * - it reads the pickable set (everything with an icon) from the active version.
 */
@Component({
	selector: 'icon-picker-dialog',
	templateUrl: './IconPickerDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, GameIconComponent],
	styles: [`
		.icon-picker-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 1060; display: flex; align-items: center; justify-content: center; }
		.icon-picker-dialog { width: min(560px, 92vw); max-height: 80vh; display: flex; flex-direction: column; }
		.icon-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap: 4px; overflow-y: auto; }
		.icon-picker-cell { display: flex; align-items: center; justify-content: center; padding: 4px; }
	`],
})
export class IconPickerDialogComponent
{

	@Output() public readonly pick = new EventEmitter<string>();
	@Output() public readonly none = new EventEmitter<void>();
	@Output() public readonly close = new EventEmitter<void>();

	public search = '';

	private readonly allOptions = computed<ItemPickerOption[]>(() => {
		const data = this.versionManager.activeVersionData();
		if (!data) {
			return [];
		}
		const items = data.items.filter(item => item.icon).map(item => ({value: item.className, label: item.name, iconHash: item.icon}));
		const buildings = data.buildings.filter(building => building.icon).map(building => ({value: building.className, label: building.name, iconHash: building.icon}));
		return [...items, ...buildings].sort((a, b) => a.label.localeCompare(b.label));
	});

	public constructor(private readonly versionManager: VersionManager)
	{
	}

	public get filtered(): ItemPickerOption[]
	{
		const term = this.search.trim().toLowerCase();
		const all = this.allOptions();
		return term === '' ? all : all.filter(option => option.label.toLowerCase().includes(term));
	}

}
