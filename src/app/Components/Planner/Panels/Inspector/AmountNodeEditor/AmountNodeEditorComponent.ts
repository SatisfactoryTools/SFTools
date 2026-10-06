import {Component, ChangeDetectionStrategy, Input, OnChanges, OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLock, faLockOpen} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
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

const APPLY_DEBOUNCE_MS = 400;

const TYPE_LABELS: Record<string, string> = {
	input: 'Input',
	product: 'Product',
	mine: 'Mine',
	byproduct: 'Byproduct',
	sink: 'Sink',
	generator: 'Generator',
};

@Component({
	selector: 'amount-node-editor',
	templateUrl: './AmountNodeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, AppTooltipDirective, GameIconComponent],
})
export class AmountNodeEditorComponent implements OnChanges, OnDestroy
{

	public readonly faLock = faLock;
	public readonly faLockOpen = faLockOpen;

	@Input({required: true}) public node!: Node;

	public amount = 0;

	public clockSpeed = 100;

	private draftClockBase = 100;

	/** A pending apply must flush against the node the user edited, even after the selection moved on. */
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
			// An applied update coming back: reflect what stuck (the reconciler may clamp elastic nodes) unless the user kept typing.
			if (!this.applyPending) {
				this.amount = this.node.amount;
				this.clockSpeed = this.draftClockBase = this.generator?.clockSpeed ?? 100;
			}
			return;
		}
		this.flushPendingApply();
		this.loadedNode = this.node;
		this.amount = this.node.amount;
		this.clockSpeed = this.draftClockBase = this.generator?.clockSpeed ?? 100;
	}

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

	public get iconHash(): string | null
	{
		return this.item?.icon ?? this.generator?.generator.icon ?? null;
	}

	public get lockTooltip(): string
	{
		return this.node.locked
			? 'Locked - the calculation keeps this node as it is. Click to unlock.'
			: 'Unlocked - the calculation may change or replace this node. Click to lock it.';
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

	public get draftPower(): number | null
	{
		const generator = this.generator;
		return generator
			? Formulas.generatorPowerProduction(generator.generator, this.amount || 0, this.draftClock)
			: null;
	}

	public get draftShards(): number
	{
		return Math.ceil((this.amount || 0) - 1e-9) * Formulas.powerShards(this.draftClock);
	}

	public get canClock(): boolean
	{
		return this.generator?.generator.canOverclock ?? false;
	}

	/** Restating the count at the new clock keeps the power, so the graph's flows stay as they were. */
	public onClockChange(): void
	{
		const clock = this.draftClock;
		if (clock !== this.draftClockBase && this.draftClockBase > 0) {
			this.amount = Math.round((this.amount || 0) * this.draftClockBase / clock * 1e6) / 1e6;
		}
		this.draftClockBase = clock;
		this.applyPending = true;
		this.applySubject.next();
	}

	private get draftClock(): number
	{
		return Formulas.clampClock(this.clockSpeed || 100);
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
		if (!node || amount <= 0) {
			return;
		}
		if (node instanceof GeneratorNode) {
			const clock = this.draftClock;
			if (Math.abs(amount - node.amount) <= 1e-9 && clock === node.clockSpeed) {
				return;
			}
			const replacement = this.resizer.withGenerator(node, amount, clock);
			if (replacement) {
				this.actions.requestNodeUpdate(replacement);
			}
			return;
		}
		if (Math.abs(amount - node.amount) <= 1e-9) {
			return;
		}
		const updated = this.resizer.withSize(node, amount);
		if (updated) {
			this.actions.requestNodeUpdate(updated);
		}
	}

}
