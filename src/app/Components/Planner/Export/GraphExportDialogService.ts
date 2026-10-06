import {Injectable, Signal, signal} from '@angular/core';
import {GraphExportOptions} from '@src/Model/Export/GraphExportOptions';

/** Its own service because the window is opened from the zoom controls and a hotkey, while the planner renders it once. */
@Injectable({providedIn: 'root'})
export class GraphExportDialogService
{

	private readonly visibleSignal = signal(false);
	public readonly visible: Signal<boolean> = this.visibleSignal.asReadonly();

	private lastOptions: GraphExportOptions = {format: 'svg', background: true, scale: 1};

	public open(): void
	{
		this.visibleSignal.set(true);
	}

	public close(): void
	{
		this.visibleSignal.set(false);
	}

	public options(): GraphExportOptions
	{
		return this.lastOptions;
	}

	public remember(options: GraphExportOptions): void
	{
		this.lastOptions = options;
	}

}
