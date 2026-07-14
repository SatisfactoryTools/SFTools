import {Component, ChangeDetectionStrategy, Input, OnChanges, OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLock, faLockOpen} from '@fortawesome/free-solid-svg-icons';
import {Subject, Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {Item} from '@src/Model/Data/Entities/Item';
import {Formulas} from '@src/Model/Planner/Formulas';
import {NodeResizer} from '@src/Model/Planner/NodeResizer';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RateFormatter} from '@src/Model/RateFormatter';

/** Quiet time after the last edit before the draft is applied to the graph. */
const APPLY_DEBOUNCE_MS = 400;

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
 * is editable for now; a change is automatically applied to the graph after a
 * short quiet period, swapping the node in and reconciling its edges exactly
 * like the recipe editor. Note that input and byproduct nodes are elastic:
 * the reconciler resizes them back to the flow their edges actually carry,
 * so a raise only sticks up to what the connected counterparts can absorb.
 */
@Component({
	selector: 'amount-node-editor',
	templateUrl: './AmountNodeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent],
})
export class AmountNodeEditorComponent implements OnChanges, OnDestroy
{

	public readonly faLock = faLock;
	public readonly faLockOpen = faLockOpen;

	@Input({required: true}) public node!: Node;

	public amount = 0;

	/**
	 * The node instance the draft was built from - a still-pending apply must
	 * flush against the node the user actually edited, even when the selection
	 * has already moved on (see ngOnChanges).
	 */
	private loadedNode: Node | null = null;

	private readonly applySubject = new Subject<void>();
	private readonly applySubscription: Subscription;
	private applyPending = false;

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly resizer: NodeResizer,
		public readonly rateFormatter: RateFormatter,
	)
	{
		this.applySubscription = this.applySubject
			.pipe(debounceTime(APPLY_DEBOUNCE_MS))
			.subscribe(() => this.applyDraft());
	}

	public ngOnChanges(): void
	{
		if (this.loadedNode?.id === this.node.id) {
			this.loadedNode = this.node;
			// An applied update coming back - reflect what actually stuck (the
			// reconciler may clamp elastic nodes), unless the user kept typing.
			if (!this.applyPending) {
				this.amount = this.node.amount;
			}
			return;
		}
		this.flushPendingApply();
		this.loadedNode = this.node;
		this.amount = this.node.amount;
	}

	/** An edit made just before deselecting the node must still reach the graph. */
	public ngOnDestroy(): void
	{
		this.flushPendingApply();
		this.applySubscription.unsubscribe();
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

	public toggleLock(): void
	{
		this.actions.requestNodeLock({nodeIds: [this.node.id], locked: !this.node.locked});
	}

	public onAmountChange(): void
	{
		this.applyPending = true;
		this.applySubject.next();
	}

	/** Applies a not-yet-debounced edit immediately - before the draft is replaced or the editor closes. */
	private flushPendingApply(): void
	{
		if (this.applyPending) {
			this.applyDraft();
		}
	}

	private applyDraft(): void
	{
		if (!this.applyPending) {
			return;
		}
		this.applyPending = false;

		const node = this.loadedNode;
		const amount = this.amount || 0;
		if (!node || amount <= 0 || Math.abs(amount - node.amount) <= 1e-9) {
			return;
		}
		const updated = this.resizer.withSize(node, amount);
		if (updated) {
			this.actions.requestNodeUpdate(updated);
		}
	}

}
