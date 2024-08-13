import {Injectable, Signal, signal} from '@angular/core';
import {ContextMenuPosition} from '@src/Components/Planner/ContextMenu/ContextMenuPosition';
import {NodeTooltipContent} from '@src/Components/Planner/Tooltip/NodeTooltipContent';

/**
 * Hover tooltips for canvas elements: the graph is x6-rendered SVG, which
 * ngx-bootstrap tooltips cannot attach to, so this mirrors the context menu's
 * signal-driven fixed overlay instead.
 */
@Injectable()
export class PlannerNodeTooltipService
{

	private readonly contentSignal = signal<NodeTooltipContent | null>(null);
	public readonly content: Signal<NodeTooltipContent | null> = this.contentSignal.asReadonly();

	private readonly positionSignal = signal<ContextMenuPosition>({x: 0, y: 0});
	public readonly position: Signal<ContextMenuPosition> = this.positionSignal.asReadonly();

	public show(content: NodeTooltipContent, x: number, y: number): void
	{
		this.positionSignal.set({x, y});
		this.contentSignal.set(content);
	}

	public hide(): void
	{
		this.contentSignal.set(null);
	}

}
