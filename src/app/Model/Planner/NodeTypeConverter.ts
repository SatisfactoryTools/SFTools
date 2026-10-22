import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';

/** Swaps keep the id and the flow side, so every connection stays valid; the result is locked like any manual edit, else the next calculation would swap it back. */
@Injectable({providedIn: 'root'})
export class NodeTypeConverter
{

	public converted(node: Node, data: Data | null): ItemAmountNode | null
	{
		let replacement: ItemAmountNode;
		if (node instanceof MineNode) {
			replacement = new InputNode(node.id, node.amount, node.item);
		} else if (node instanceof InputNode && data?.resources.includes(node.item.className)) {
			replacement = new MineNode(node.id, node.amount, node.item);
		} else if (node instanceof ByproductNode) {
			replacement = new ProductNode(node.id, node.amount, node.item);
		} else if (node instanceof ProductNode) {
			replacement = new ByproductNode(node.id, node.amount, node.item);
		} else {
			return null;
		}
		replacement.x = node.x;
		replacement.y = node.y;
		replacement.locked = true;
		replacement.done = node.done;
		return replacement;
	}

}
