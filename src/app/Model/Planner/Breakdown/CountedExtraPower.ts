import {ExtraPower} from '@src/Model/Planner/ExtraPower';

export interface CountedExtraPower
{

	readonly extraPower: ExtraPower;

	readonly generated: number;

	readonly count: number;

}
