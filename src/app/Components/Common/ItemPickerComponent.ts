import {Component, ElementRef, Input, Output, EventEmitter, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BsDropdownModule, BsDropdownDirective} from 'ngx-bootstrap/dropdown';
import {FitViewportDirective} from '@src/Components/Common/FitViewportDirective';
import {FocusOnInitDirective} from '@src/Components/Common/FocusOnInitDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';

/**
 * A searchable select styled like a Bootstrap form-select: the toggle shows the
 * selected option's icon and label, the menu opens with a filter box and a
 * scrollable, icon-prefixed list. The menu renders on the body (container="body")
 * so it overlays the planner instead of being clipped by a panel's overflow.
 *
 * It is driven from the keyboard alone: one option is always highlighted (the
 * chosen one when the menu opens, the first match while filtering), the arrow
 * keys move that highlight, Enter takes it and Escape leaves.
 */
@Component({
	selector: 'item-picker',
	templateUrl: './ItemPickerComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, BsDropdownModule, GameIconComponent, FocusOnInitDirective, FitViewportDirective],
	styles: [`
		/* The highlight is the keyboard's cursor: lighter than the blue
		   .active (which means "this is the chosen one"), and shown on hover
		   too so pointer and keyboard agree on where the cursor is. */
		.picker-option.highlighted {
			background: rgba(255, 255, 255, 0.1);
			box-shadow: inset 2px 0 0 #4c9be8;
		}
		.picker-option.highlighted.active {
			box-shadow: inset 2px 0 0 #fff;
		}
		/* A phone gives the menu the width it has, not 320px of it. */
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

	/** Index into `filtered` of the option the keyboard is on. */
	public highlighted = 0;

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

	/** Typing narrows the list, so the highlight goes back to the best match. */
	public onSearchChange(search: string): void
	{
		this.search = search;
		this.highlighted = 0;
	}

	/**
	 * The search box owns the keyboard while the menu is open - the options
	 * themselves are never focused, so the caret stays where the user types.
	 */
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
		// Open on the chosen option rather than the top of the list, so the
		// menu starts where the value already is.
		this.highlighted = Math.max(0, this.filtered.findIndex(option => option.value === this.value));
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
		setTimeout(() => this.scrollHighlightedIntoView(), 60);
	}

	private moveHighlight(step: number, count: number): void
	{
		if (count === 0) {
			return;
		}
		// Wraps around, so holding Down from the last option comes back to the top.
		this.setHighlight((this.highlighted + step + count) % count);
	}

	private setHighlight(index: number): void
	{
		this.highlighted = Math.max(0, index);
		this.scrollHighlightedIntoView();
	}

	/** Keeps the highlighted row inside the scrolling list as the arrows walk past its edge. */
	private scrollHighlightedIntoView(): void
	{
		const menu = this.searchInput?.nativeElement.closest('.dropdown-menu')
			?? document.querySelector('.dropdown-menu.show');
		const option = menu?.querySelectorAll('.picker-option')[this.highlighted];
		option?.scrollIntoView({block: 'nearest'});
	}

}
