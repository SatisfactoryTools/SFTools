import {Component, ElementRef, Input, Output, EventEmitter, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BsDropdownModule, BsDropdownDirective} from 'ngx-bootstrap/dropdown';
import {FitViewportDirective} from '@src/Components/Common/FitViewportDirective';
import {FocusOnInitDirective} from '@src/Components/Common/FocusOnInitDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';

@Component({
	selector: 'item-picker',
	templateUrl: './ItemPickerComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, BsDropdownModule, GameIconComponent, FocusOnInitDirective, FitViewportDirective],
	styles: [`
		.picker-option.highlighted {
			background: rgba(255, 255, 255, 0.1);
			box-shadow: inset 2px 0 0 #4c9be8;
		}
		.picker-option.highlighted.active {
			box-shadow: inset 2px 0 0 #fff;
		}
		.picker-menu {
			min-width: min(320px, calc(100vw - 16px));
			max-width: calc(100vw - 16px);
		}
	`],
})
export class ItemPickerComponent
{

	@Input() public options: ItemPickerOption[] = [];
	@Input() public value = '';
	@Input() public placeholder = '- select -';
	@Output() public valueChange = new EventEmitter<string>();

	@ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

	public search = '';

	public highlighted = 0;

	public get selected(): ItemPickerOption | null
	{
		return this.options.find(option => option.value === this.value) ?? null;
	}

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

	public onSearchChange(search: string): void
	{
		this.search = search;
		this.highlighted = 0;
	}

	/** Keyboard handling lives on the search box; the options are never focused, so the caret stays where the user types. */
	public onSearchKeyDown(event: KeyboardEvent, dropdown: BsDropdownDirective): void
	{
		const options = this.filtered;
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				this.moveHighlight(1, options.length);
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.moveHighlight(-1, options.length);
				break;
			case 'Home':
				event.preventDefault();
				this.setHighlight(0);
				break;
			case 'End':
				event.preventDefault();
				this.setHighlight(options.length - 1);
				break;
			case 'Enter': {
				event.preventDefault();
				const option = options[this.highlighted];
				if (option) {
					this.select(option, dropdown);
				}
				break;
			}
			case 'Escape':
			case 'Tab':
				dropdown.hide();
				break;
		}
	}

	/** Focused here, once ngx-bootstrap has positioned the body menu: the focusOnInit tick can be lost inside a modal. The ViewChild does not resolve for lazily created pickers, so fall back to the one open menu's search box. */
	public onShown(): void
	{
		this.search = '';
		this.highlighted = Math.max(0, this.filtered.findIndex(option => option.value === this.value));
		// The menu isn't in the DOM the instant onShown fires, and ngx-bootstrap focuses the toggle a frame later - poll briefly to win that race.
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
		setTimeout(() => this.scrollHighlightedIntoView(), 60);
	}

	private moveHighlight(step: number, count: number): void
	{
		if (count === 0) {
			return;
		}
		this.setHighlight((this.highlighted + step + count) % count);
	}

	private setHighlight(index: number): void
	{
		this.highlighted = Math.max(0, index);
		this.scrollHighlightedIntoView();
	}

	private scrollHighlightedIntoView(): void
	{
		const menu = this.searchInput?.nativeElement.closest('.dropdown-menu')
			?? document.querySelector('.dropdown-menu.show');
		const option = menu?.querySelectorAll('.picker-option')[this.highlighted];
		option?.scrollIntoView({block: 'nearest'});
	}

}
