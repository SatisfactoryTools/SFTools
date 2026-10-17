import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {RateFormatter} from '@src/Model/RateFormatter';

export class RecipeSwapMenu extends PlannerContextMenu
{

	/** Each option is the finished replacement node, so the hint shows exactly what the swap would need and make. */
	public constructor(
		private readonly options: RecipeNode[],
		private readonly rateFormatter: RateFormatter,
		private readonly onPick: (option: RecipeNode) => void,
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return 'Change recipe';
	}

	public getItems(): ContextMenuItem[]
	{
		return this.options.map(option => ({
			label: option.recipe.name,
			hint: `${this.rates(option.inputs)} → ${this.rates(option.outputs)}`,
			action: () => this.onPick(option),
		}));
	}

	private rates(ios: NodeIO[]): string
	{
		return ios.map(io => `${this.rateFormatter.rate(io.maxAmount, io.item)} ${io.item.name}`).join(', ');
	}

}
