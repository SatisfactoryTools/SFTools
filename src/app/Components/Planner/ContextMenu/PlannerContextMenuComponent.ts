import {AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {ContextMenuSize} from '@src/Components/Planner/ContextMenu/ContextMenuSize';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlannerContextMenuService} from '@src/Components/Planner/ContextMenu/PlannerContextMenuService';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';

@Component({
	selector: 'planner-context-menu',
	templateUrl: './PlannerContextMenuComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
	styles: [`
		.menu-hotkey {
			margin-left: auto;
			padding-left: 1.5rem;
			font-size: 0.8em;
			color: #7d8ca5;
		}
		.dropdown-item:hover .menu-hotkey { color: #a9b8cd; }
		.dropdown-item:disabled .menu-hotkey { color: #55617a; }
	`],
})
export class PlannerContextMenuComponent implements AfterViewChecked
{

	private static readonly MARGIN = 4;

	@ViewChild('menuElement') private menuElement?: ElementRef<HTMLElement>;

	private readonly sizeSignal = signal<ContextMenuSize | null>(null);
	public readonly size = this.sizeSignal.asReadonly();

	private measuredMenu: PlannerContextMenu | null = null;

	public constructor(
		public readonly contextMenu: PlannerContextMenuService,
		public readonly hotkeys: HotkeyService,
		private readonly elementRef: ElementRef<HTMLElement>,
	)
	{
	}

	public get left(): number
	{
		return this.clamp(this.contextMenu.position().x, this.size()?.width ?? 0, window.innerWidth);
	}

	public get top(): number
	{
		return this.clamp(this.contextMenu.position().y, this.size()?.height ?? 0, window.innerHeight);
	}

	public get maxHeight(): number
	{
		return window.innerHeight - 2 * PlannerContextMenuComponent.MARGIN;
	}

	/** Setting the size signal schedules one more check, in which the measurement matches and nothing changes - no loop. */
	public ngAfterViewChecked(): void
	{
		const menu = this.contextMenu.menu();
		const element = this.menuElement?.nativeElement;
		if (!menu || !element) {
			if (this.measuredMenu !== null) {
				this.measuredMenu = null;
				this.sizeSignal.set(null);
			}
			return;
		}
		const size: ContextMenuSize = {width: element.offsetWidth, height: element.offsetHeight};
		const current = this.size();
		if (this.measuredMenu !== menu || !current || current.width !== size.width || current.height !== size.height) {
			this.measuredMenu = menu;
			this.sizeSignal.set(size);
		}
	}

	public run(item: ContextMenuItem): void
	{
		if (item.disabled) {
			return;
		}
		this.contextMenu.close();
		item.action();
	}

	/** A touch never reaches the mousedown above while the finger is down, so a touch anywhere outside closes the menu too. */
	@HostListener('document:mousedown', ['$event'])
	@HostListener('document:touchstart', ['$event'])
	public onDocumentMouseDown(event: MouseEvent | TouchEvent): void
	{
		if (!this.contextMenu.menu()) {
			return;
		}
		if (this.elementRef.nativeElement.contains(event.target as globalThis.Node)) {
			return;
		}
		this.contextMenu.close();
	}

	/** Any key closes the menu, not just Escape: hotkeys act on the selection, which need not be what was right-clicked. */
	@HostListener('document:keydown')
	public onKeyDown(): void
	{
		this.contextMenu.close();
	}

	private clamp(position: number, extent: number, viewport: number): number
	{
		const margin = PlannerContextMenuComponent.MARGIN;
		return Math.max(margin, Math.min(position, viewport - extent - margin));
	}

}
