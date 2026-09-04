import {Injectable, Signal, signal} from '@angular/core';
import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';

/**
 * The production request panel's active tab, kept outside the component: the
 * panel is destroyed and re-created when the layout switches between desktop
 * and phone, and the user's place must survive that. In memory only - a page
 * reload starts at the request tab again.
 */
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
