import {faBolt, faGaugeHigh, faIndustry, faListCheck, faMountain, faRecycle, faRightFromBracket, faRightToBracket, faScroll, faSliders, faWandMagicSparkles} from '@fortawesome/free-solid-svg-icons';
import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';
import {CalculatorTabDefinition} from '@src/Components/Planner/Panels/Calculator/CalculatorTabDefinition';

/** Shared by the tab strip and the Settings page, which lets the user pick the tabs listed under More. */
export class CalculatorTabDefinitions
{

	public static readonly ALL: readonly CalculatorTabDefinition[] = [
		{id: 'request', label: 'Request', icon: faListCheck},
		{id: 'resources', label: 'Resources', icon: faMountain},
		{id: 'recipes', label: 'Recipes', icon: faScroll},
		{id: 'machines', label: 'Machines', icon: faIndustry},
		{id: 'input', label: 'Input', icon: faRightToBracket},
		{id: 'byproducts', label: 'Byproducts', icon: faRightFromBracket},
		{id: 'power', label: 'Power', icon: faBolt},
		{id: 'sink', label: 'Sink', icon: faRecycle},
		{id: 'sloops', label: 'Sloops', icon: faWandMagicSparkles},
		{id: 'overclocking', label: 'Overclocking', icon: faGaugeHigh},
		{id: 'optimisation', label: 'Optimisation', icon: faSliders},
	];

	public static readonly DEFAULT_MORE: readonly CalculatorTab[] = ['machines', 'byproducts', 'sink', 'sloops', 'overclocking', 'optimisation'];

	public static labelOf(tab: CalculatorTab): string
	{
		return CalculatorTabDefinitions.ALL.find(definition => definition.id === tab)?.label ?? tab;
	}

}
