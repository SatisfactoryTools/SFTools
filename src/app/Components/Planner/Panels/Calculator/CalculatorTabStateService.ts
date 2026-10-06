import {Injectable, Signal, signal} from '@angular/core';
import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';

/** Kept outside the component: the panel is re-created when the layout switches between desktop and phone. */
@Injectable({providedIn: 'root'})
export class CalculatorTabStateService
{

	private readonly activeTabSignal = signal<CalculatorTab>('request');
	public readonly activeTab: Signal<CalculatorTab> = this.activeTabSignal.asReadonly();

	public setActiveTab(tab: CalculatorTab): void
	{
		this.activeTabSignal.set(tab);
	}

}
