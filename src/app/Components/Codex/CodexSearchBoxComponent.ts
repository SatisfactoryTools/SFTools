import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMagnifyingGlass, faXmark} from '@fortawesome/free-solid-svg-icons';
import {CodexSearchState} from '@src/Components/Codex/CodexSearchState';

/**
 * The codex panel's search input: writes the shared CodexSearchState, whose
 * result list (codex-search-results) the host shows in place of the browsed
 * content. Arrow keys move the cursor, Enter opens, Escape clears.
 */
@Component({
	selector: 'codex-search-box',
	templateUrl: './CodexSearchBoxComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
	styles: `
		:host {
			display: block;
		}
		.search-icon {
			position: absolute;
			left: 0.6rem;
			top: 50%;
			transform: translateY(-50%);
			pointer-events: none;
			color: #9fb0c0;
		}
		input {
			padding-left: 1.9rem;
		}
		input::-webkit-search-cancel-button {
			display: none;
		}
		.clear-btn {
			position: absolute;
			right: 0.15rem;
			top: 50%;
			transform: translateY(-50%);
			border: 0;
			background: transparent;
			color: #9fb0c0;
			padding: 0 0.4rem;
			line-height: 1;
		}
		.clear-btn:hover {
			color: #fff;
		}
	`,
})
export class CodexSearchBoxComponent
{

	public readonly faMagnifyingGlass = faMagnifyingGlass;
	public readonly faXmark = faXmark;

	public constructor(public readonly state: CodexSearchState)
	{
	}

	protected onInput(event: Event): void
	{
		this.state.setQuery((event.target as HTMLInputElement).value);
	}

	protected onKeydown(event: KeyboardEvent): void
	{
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				this.state.moveActive(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.state.moveActive(-1);
				break;
			case 'Enter':
				event.preventDefault();
				this.state.openActive();
				break;
			case 'Escape':
				this.state.clear();
				break;
		}
	}

}
