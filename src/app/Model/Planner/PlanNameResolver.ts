import {Injectable} from '@angular/core';
import {Plan} from '@src/Model/Planner/Plan';

@Injectable({providedIn: 'root'})
export class PlanNameResolver
{

	public displayName(plan: Plan): string
	{
		return this.displayNameOf(plan.name);
	}

	public displayNameOf(name: string): string
	{
		return name.trim() !== '' ? name : 'Unnamed plan';
	}

}
