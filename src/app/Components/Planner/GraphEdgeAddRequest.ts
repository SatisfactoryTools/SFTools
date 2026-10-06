export interface GraphEdgeAddRequest
{
	readonly sourceId: string;
	readonly targetId: string;
	readonly itemClassName: string;
	readonly clientX: number;
	readonly clientY: number;
}
