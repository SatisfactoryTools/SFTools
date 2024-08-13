import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {RateFormatter} from '@src/Model/RateFormatter';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/**
 * Read-only inspector view of a subplan node: the subplan's outside
 * interface (inputs and outputs) is defined by the subplan's own graph and
 * can only be changed by editing the subplan itself.
 */
@Component({
	selector: 'subplan-node-view',
	templateUrl: './SubplanNodeViewComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
})
export class SubplanNodeViewComponent
{

	@Input({required: true}) public node!: SubplanNode;

	public constructor(
		public readonly rateFormatter: RateFormatter,
		private readonly planManager: PlanManager,
		private readonly planNames: PlanNameResolver,
	)
	{
	}

	public get displayName(): string
	{
		const plan = this.planManager.plans().find(candidate => candidate.id === this.node.subplanId);
		return plan ? this.planNames.displayName(plan) : this.node.name;
	}

}
