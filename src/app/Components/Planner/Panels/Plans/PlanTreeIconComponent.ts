import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faDiagramProject, faFileLines, faFolder, faFolderOpen} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';

@Component({
	selector: 'plan-tree-icon',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, GameIconComponent],
	template: `
		@if (kind === 'folder') {
			<fa-icon class="plan-tree-folder" [icon]="open ? faFolderOpen : faFolder"></fa-icon>
		} @else {
			@if (iconHash; as hash) {
				<game-icon [hash]="hash" [size]="18" [alt]="alt"></game-icon>
			} @else {
				<fa-icon class="text-secondary" [icon]="faFileLines"></fa-icon>
			}
			@if (subplan) {
				<fa-icon class="plan-tree-subplan-badge" [icon]="faDiagramProject"></fa-icon>
			}
		}
	`,
	styles: `
		:host {
			position: relative;
			display: inline-flex;
			align-items: center;
			flex-shrink: 0;
		}
		.plan-tree-folder {
			color: #d7a955;
		}
		/* No backing shape: an outline drawn by the shadows keeps it readable on any icon. */
		.plan-tree-subplan-badge {
			position: absolute;
			right: -0.25rem;
			bottom: -0.2rem;
			font-size: 0.65rem;
			line-height: 1;
			color: rgb(120, 175, 235);
			filter: drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000);
			pointer-events: none;
		}
	`,
})
export class PlanTreeIconComponent
{

	@Input() public kind: 'folder' | 'plan' = 'plan';
	@Input() public open: boolean = false;
	@Input() public iconHash: string | null = null;
	@Input() public subplan: boolean = false;
	@Input() public alt: string = '';

	public readonly faFolder = faFolder;
	public readonly faFolderOpen = faFolderOpen;
	public readonly faFileLines = faFileLines;
	public readonly faDiagramProject = faDiagramProject;

}
