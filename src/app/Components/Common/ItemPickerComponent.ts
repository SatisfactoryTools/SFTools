import {Component, ElementRef, Input, Output, EventEmitter, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BsDropdownModule, BsDropdownDirective} from 'ngx-bootstrap/dropdown';
import {FocusOnInitDirective} from '@src/Components/Common/FocusOnInitDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';

/**
 * A searchable select styled like a Bootstrap form-select: the toggle shows the
 * selected option's icon and label, the menu opens with a filter box and a
 * scrollable, icon-prefixed list. The menu renders on the body (container="body")
 * so it overlays the planner instead of being clipped by a panel's overflow.
 */
@Component({
	selector: 'item-picker',
	templateUrl: './ItemPickerComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, BsDropdownModule, GameIconComponent, FocusOnInitDirective],
})
export class ItemPickerComponent
{

	@Input() public options: ItemPickerOption[] = [];
	@Input() public value = '';
	@Input() public placeholder = '- select -';
	@Output() public valueChange = new EventEmitter<string>();

	@ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

	public search = '';

	public get selected(): ItemPickerOption | null
	{
		return this.options.find(option => option.value === this.value) ?? null;
	}

	/** Name-substring match; empty filter shows everything. */
	public get filtered(): ItemPickerOption[]
	{
		const term = this.search.trim().toLowerCase();
		if (term === '') {
			return this.options;
		}
		return this.options.filter(option => option.label.toLowerCase().includes(term));
	}

	public select(option: ItemPickerOption, dropdown: BsDropdownDirective): void
	{
		this.value = option.value;
		this.valueChange.emit(option.value);
		dropdown.hide();
	}

	/**
	 * Fresh filter on every open, then focus the search box. Focusing here -
	 * once ngx-bootstrap has shown and positioned the container="body" menu -
	 * is reliable even inside a modal, where the initial focusOnInit tick can
	 * be lost when the menu is relocated to the body. The ViewChild does not
	 * resolve for pickers created lazily (e.g. behind an @if), so fall back to
	 * the one open menu's search box (only one picker is ever open at a time).
	 */
	public onShown(): void
	{
		this.search = '';
		// The menu isn't in the DOM the instant onShown fires, and ngx-bootstrap
		// focuses the toggle a frame later - so poll briefly, focusing the search
		// box once it exists and keeping at it long enough to win that race.
		let tries = 0;
		const attempt = () => {
			const input = this.searchInput?.nativeElement
				?? document.querySelector<HTMLInputElement>('.dropdown-menu.show input[type="search"]');
			input?.focus();
			if (tries++ < 5) {
				setTimeout(attempt, 30);
			}
		};
		attempt();
	}

}
