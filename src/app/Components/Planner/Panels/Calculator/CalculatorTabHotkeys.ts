import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';
import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';

/**
 * Which hotkey opens which production request tab. Kept in one place because
 * two parts need it and neither can ask the other: the planner registers the
 * keys (the panel is often not even built), and the tab bar puts the key in
 * each tab's tooltip.
 */
export class CalculatorTabHotkeys
{

	/** In tab order, which is also the order of the keys on the number row. */
	public static readonly ENTRIES: {action: HotkeyAction; tab: CalculatorTab}[] = [
		{action: 'calculator.request', tab: 'request'},
		{action: 'calculator.resources', tab: 'resources'},
		{action: 'calculator.recipes', tab: 'recipes'},
		{action: 'calculator.machines', tab: 'machines'},
		{action: 'calculator.input', tab: 'input'},
		{action: 'calculator.byproducts', tab: 'byproducts'},
		{action: 'calculator.power', tab: 'power'},
		{action: 'calculator.sink', tab: 'sink'},
		{action: 'calculator.sloops', tab: 'sloops'},
		{action: 'calculator.overclocking', tab: 'overclocking'},
		{action: 'calculator.optimisation', tab: 'optimisation'},
	];

	public static actionFor(tab: CalculatorTab): HotkeyAction | undefined
	{
		return CalculatorTabHotkeys.ENTRIES.find(entry => entry.tab === tab)?.action;
	}

}
