import {Injectable} from '@angular/core';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';
import {VersionConversionContext} from '@src/Model/PlanFiles/Conversion/VersionConversionContext';

@Injectable({providedIn: 'root'})
export class RecipeChangeDetector
{

	/** Only what changes the node's rates; the machine is checked separately because a node may keep a machine the recipe lost. */
	public changes(source: Recipe, target: Recipe): string[]
	{
		const changes: string[] = [];
		if (this.amountsDiffer(source.ingredients, target.ingredients)) {
			changes.push('ingredients');
		}
		if (this.amountsDiffer(source.products, target.products)) {
			changes.push('products');
		}
		if (VersionConversionContext.differs(source.time, target.time)) {
			changes.push('duration');
		}
		return changes;
	}

	public powerDiffers(source: Recipe, target: Recipe): boolean
	{
		return source.variablePowerDraw !== target.variablePowerDraw
			|| VersionConversionContext.differs(source.variablePowerDrawConstant, target.variablePowerDrawConstant)
			|| VersionConversionContext.differs(source.variablePowerDrawFactor, target.variablePowerDrawFactor);
	}

	/** Hydration tolerates dangling item references (mods), hence the optional chaining. */
	private amountsDiffer(source: readonly ItemAmount[], target: readonly ItemAmount[]): boolean
	{
		if (source.length !== target.length) {
			return true;
		}
		const amounts = new Map(source.map(entry => [entry.item?.className, entry.amount]));
		return target.some(entry => {
			const amount = amounts.get(entry.item?.className);
			return amount === undefined || VersionConversionContext.differs(amount, entry.amount);
		});
	}

}
