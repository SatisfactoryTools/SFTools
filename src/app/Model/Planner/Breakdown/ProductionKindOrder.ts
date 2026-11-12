import {ProductionKind} from '@src/Model/Planner/Breakdown/ProductionKind';

export class ProductionKindOrder
{

	private static readonly RANK: Record<ProductionKind, number> = {product: 0, sink: 1, byproduct: 2};

	public static compare(a: ProductionKind, b: ProductionKind): number
	{
		return ProductionKindOrder.RANK[a] - ProductionKindOrder.RANK[b];
	}

}
