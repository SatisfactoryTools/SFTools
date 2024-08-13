/** Accent colour (hex) per graph node type; the node fill is derived from it. */
export interface NodeColors
{

	readonly recipe: string;
	readonly generator: string;
	readonly sink: string;
	readonly mine: string;
	readonly input: string;
	readonly product: string;
	readonly byproduct: string;
	readonly subplan: string;

}
