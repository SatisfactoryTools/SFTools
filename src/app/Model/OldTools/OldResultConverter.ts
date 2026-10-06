import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {OldResultConversion} from '@src/Model/OldTools/OldResultConversion';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SinkNode} from '@src/Model/Planner/Solver/Response/SinkNode';

/** Amounts below this are the old LP's float dust, not nodes. */
const EPSILON = 1e-6;

@Injectable({providedIn: 'root'})
export class OldResultConverter
{

	public constructor(private readonly normalizer: MachineGroupNormalizer)
	{
	}

	public convert(result: Record<string, number>, data: Data, groupingMode: GroupingMode): OldResultConversion
	{
		const nodes: Node[] = [];
		const unknown: string[] = [];

		for (const [column, raw] of Object.entries(result)) {
			const amount = Number(raw);
			if (!Number.isFinite(amount) || Math.abs(amount) < EPSILON) {
				continue;
			}
			const hash = column.indexOf('#');
			if (hash === -1) {
				continue;
			}
			const left = column.substring(0, hash);
			const kind = column.substring(hash + 1);
			// The old LP's `special__` pseudo-items (power, sink points) and its maximise bookkeeping have no node.
			if (left.startsWith('special__') || left === 'Maximise') {
				continue;
			}
			const id = crypto.randomUUID();

			switch (kind) {
				case 'Mine':
				case 'Product':
				case 'Byproduct':
				case 'Input':
				case 'Sink':
				case 'special__points': {
					const item = data.searchItemByClassName(left);
					if (!item) {
						unknown.push(left);
						continue;
					}
					switch (kind) {
						case 'Mine': nodes.push(new MineNode(id, amount, item)); break;
						case 'Product': nodes.push(new ProductNode(id, amount, item)); break;
						case 'Byproduct': nodes.push(new ByproductNode(id, amount, item)); break;
						case 'Input': nodes.push(new InputNode(id, amount, item)); break;
						default: nodes.push(new SinkNode(id, amount, item));
					}
					break;
				}
				default: {
					const [recipeClass, clockText] = left.split('@');
					const recipe = data.searchRecipeByClassName(recipeClass);
					const machine = data.searchBuildingByClassName(kind);
					if (!recipe || !machine) {
						unknown.push(!recipe ? recipeClass : kind);
						continue;
					}
					const clock = clockText ? parseFloat(clockText) : 100;
					if (!Number.isFinite(clock) || clock <= 0) {
						continue;
					}
					// The old value counts machines at the column's clock; the node's target is machine-equivalents at 100%.
					const node = new RecipeNode(
						id,
						amount * clock / 100,
						this.normalizer.generate(amount, clock, 0, groupingMode),
						machine,
						recipe,
					);
					node.groupingMode = groupingMode;
					nodes.push(node);
				}
			}
		}

		return {nodes, unknownClassNames: unknown};
	}

}
