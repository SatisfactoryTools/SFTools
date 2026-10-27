import {MapTarget} from '@src/Model/Map/MapTarget';

export interface MapTargetOption
{
	readonly key: string;
	readonly target: MapTarget;
	readonly name: string;
	readonly depth: number;
	readonly iconHash: string | null;
	readonly subplan: boolean;
}
