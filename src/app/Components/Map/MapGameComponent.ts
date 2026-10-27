import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCheck, faFileImport, faGamepad} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {Game} from '@src/Model/Game/Game';
import {GameEditor} from '@src/Model/Game/GameEditor';
import {GameLabels} from '@src/Model/Game/GameLabels';
import {GameManager} from '@src/Model/Game/GameManager';

/** The one place the map names the game: most people only ever see their save's name here. */
@Component({
	selector: 'map-game',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, BsDropdownModule, AppTooltipDirective],
	template: `
		@if (games.activeGame(); as game) {
			<!-- container="body": a map in a panel would clip the menu. -->
			<div class="btn-group shadow-sm" dropdown container="body" placement="bottom left">
				<button type="button" class="btn btn-sm btn-dark dropdown-toggle game-toggle" dropdownToggle aria-label="Your game">
					<fa-icon [icon]="faGamepad" class="me-1"></fa-icon><span class="game-name">{{ labels.name(game) }}</span>
				</button>
				<div *dropdownMenu class="dropdown-menu" role="menu" style="min-width: 240px">
					<span class="dropdown-item-text small text-secondary">{{ labels.loaded(game) }}</span>
					@if (games.games().length > 1) {
						<div class="dropdown-divider"></div>
						@for (other of games.games(); track other.id) {
							<button type="button" class="dropdown-item d-flex align-items-center gap-2" role="menuitem" (click)="select(other)">
								<fa-icon [icon]="faCheck" [fixedWidth]="true" [style.visibility]="other.id === game.id ? 'visible' : 'hidden'"></fa-icon>
								<span class="text-truncate">{{ labels.name(other) }}</span>
							</button>
						}
					}
					<div class="dropdown-divider"></div>
					<button type="button" class="dropdown-item" role="menuitem" (click)="load.emit()">Load a newer save&hellip;</button>
					<button type="button" class="dropdown-item" role="menuitem" (click)="remove(game)">Remove this game</button>
				</div>
			</div>
		} @else {
			<button
				type="button"
				class="btn btn-sm btn-dark shadow-sm"
				tooltip="Load taken nodes, collected items and players from your save" placement="bottom" container="body"
				aria-label="Load from a save file"
				(click)="load.emit()"
			><fa-icon [icon]="faFileImport" [fixedWidth]="true"></fa-icon></button>
		}
	`,
	styles: `
		.game-toggle {
			display: inline-flex;
			align-items: center;
			max-width: 200px;
		}
		.game-name {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	`,
})
export class MapGameComponent
{

	public readonly faCheck = faCheck;
	public readonly faFileImport = faFileImport;
	public readonly faGamepad = faGamepad;

	@Output() public readonly load = new EventEmitter<void>();

	public constructor(
		public readonly games: GameManager,
		public readonly labels: GameLabels,
		private readonly editor: GameEditor,
	)
	{
	}

	public select(game: Game): void
	{
		this.editor.select(game.id);
	}

	public remove(game: Game): void
	{
		if (confirm(`Remove "${this.labels.name(game)}" from the map? Its taken nodes and collected items are forgotten; your plans stay.`)) {
			this.editor.remove(game.id);
		}
	}

}
