import {Injectable} from '@angular/core';
import {Plan} from '@src/Model/Planner/Plan';

/**
 * The name to show for a plan: its own name, or "Unnamed plan" when it has none
 * yet. A plan's name is set (saved) to "[Item] factory" when its first product
 * is added - see CalculatorProductionTabComponent - so no live derivation here.
 */
@Injectable({providedIn: 'root'})
export class PlanNameResolver
{

	public displayName(plan: Plan): string
	{
		return plan.name.trim() !== '' ? plan.name : 'Unnamed plan';
	}

}
