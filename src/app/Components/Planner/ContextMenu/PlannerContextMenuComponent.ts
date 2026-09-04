import {AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {ContextMenuSize} from '@src/Components/Planner/ContextMenu/ContextMenuSize';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlannerContextMenuService} from '@src/Components/Planner/ContextMenu/PlannerContextMenuService';

/**
 * The fixed overlay for the graph's context menus. The menu opens at the
 * pointer, but is kept inside the viewport: it is rendered hidden first,
 * measured, and only then placed - shifted up or left as far as needed, and
 * scrolling internally if it is taller than the viewport itself.
 */
@Component({
	selector: 'planner-context-menu',
	templateUrl: './PlannerContextMenuComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
})
export class PlannerContextMenuComponent implements AfterViewChecked
{

	/** Gap kept between the menu and the viewport edge. */
	private static readonly MARGIN = 4;

	@ViewChild('menuElement') private menuElement?: ElementRef<HTMLElement>;

	/** Size of the currently open menu; null until measured (the menu stays invisible meanwhile). */
	private readonly sizeSignal = signal<ContextMenuSize | null>(null);
	public readonly size = this.sizeSignal.asReadonly();

	/** The menu the size was measured for - a different menu needs measuring again. */
	private measuredMenu: PlannerContextMenu | null = null;

	public constructor(
		public readonly contextMenu: PlannerContextMenuService,
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

	/** Never taller than the viewport - long menus scroll instead of overflowing. */
	public get maxHeight(): number
	{
		return window.innerHeight - 2 * PlannerContextMenuComponent.MARGIN;
	}

	/**
	 * Measures the menu once it is in the DOM. Setting the size signal
	 * schedules one more check, in which the measurement matches and nothing
	 * changes - no loop.
	 */
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

	@HostListener('document:mousedown', ['$event'])
	public onDocumentMouseDown(event: MouseEvent): void
	{
		if (!this.contextMenu.menu()) {
			return;
		}
		if (this.elementRef.nativeElement.contains(event.target as globalThis.Node)) {
			return;
		}
		this.contextMenu.close();
	}

	@HostListener('document:keydown.escape')
	public onEscape(): void
	{
		this.contextMenu.close();
	}

	/** The pointer position, pulled back so the menu ends before the viewport edge, never past the start. */
	private clamp(position: number, extent: number, viewport: number): number
	{
		const margin = PlannerContextMenuComponent.MARGIN;
		return Math.max(margin, Math.min(position, viewport - extent - margin));
	}

}
