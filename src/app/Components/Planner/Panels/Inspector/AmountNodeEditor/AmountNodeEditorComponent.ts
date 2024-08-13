import {Component, ChangeDetectionStrategy, Input, OnChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLock, faLockOpen} from '@fortawesome/free-solid-svg-icons';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {Item} from '@src/Model/Data/Entities/Item';
import {Formulas} from '@src/Model/Planner/Formulas';
import {NodeResizer} from '@src/Model/Planner/NodeResizer';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RateFormatter} from '@src/Model/RateFormatter';

const TYPE_LABELS: Record<string, string> = {
	input: 'Input',
	product: 'Product',
	mine: 'Mine',
	byproduct: 'Byproduct',
	sink: 'Sink',
	generator: 'Generator',
};

/**
 * Inspector editor for the single-scalar nodes - input, product, mine,
 * byproduct, sink (item rate) and generator (machine count). Only the amount
 * is editable for now; applying swaps the node into the graph and reconciles
 * its edges, exactly like the recipe editor. Note that input and byproduct
 * nodes are elastic: the reconciler resizes them back to the flow their
 * edges actually carry, so a raise only sticks up to what the connected
 * counterparts can absorb.
 */
@Component({
	selector: 'amount-node-editor',
	templateUrl: './AmountNodeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent],
})
export class AmountNodeEditorComponent implements OnChanges
{

	public readonly faLock = faLock;
	public readonly faLockOpen = faLockOpen;

	@Input({required: true}) public node!: Node;

	public amount = 0;

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly resizer: NodeResizer,
		public readonly rateFormatter: RateFormatter,
	)
	{
	}

	public ngOnChanges(): void
	{
		this.amount = this.node.amount;
	}

	public get typeLabel(): string
	{
		return TYPE_LABELS[this.node.type] ?? this.node.type;
	}

	public get item(): Item | null
	{
		return this.node instanceof ItemAmountNode ? this.node.item : null;
	}

	public get generator(): GeneratorNode | null
	{
		return this.node instanceof GeneratorNode ? this.node : null;
	}

	public get amountLabel(): string
	{
		return this.generator ? 'Machines' : 'Rate';
	}

	public get unit(): string | null
	{
		const item = this.item;
		return item ? this.rateFormatter.unit(item) : null;
	}

	/** Power the drafted machine count would produce; null for non-generators. */
	public get draftPower(): number | null
	{
		const generator = this.generator;
		return generator ? Formulas.generatorPowerProduction(generator.generator, this.amount || 0) : null;
	}

	public get isModified(): boolean
	{
		return Math.abs((this.amount || 0) - this.node.amount) > 1e-9;
	}

	public get canApply(): boolean
	{
		return this.isModified && (this.amount || 0) > 0;
	}

	public toggleLock(): void
	{
		this.actions.requestNodeLock({nodeIds: [this.node.id], locked: !this.node.locked});
	}

	public apply(): void
	{
		const updated = this.resizer.withSize(this.node, this.amount || 0);
		if (updated) {
			this.actions.requestNodeUpdate(updated);
		}
	}

}
