import {PowerUnit} from '@src/Model/Planner/PowerUnit';
import {ProductionRequestMode} from '@src/Model/Planner/ProductionRequestMode';

export interface ProductionRequest
{
	itemClassName: string;
	/** Ignored (and preserved) while mode is 'maximise'. */
	ratePerMinute: number;
	/** Absent = 'rate'; covers requests saved before maximise existed. */
	mode?: ProductionRequestMode;
	/** Input unit for power rows - the stored rate stays MW. Absent = 'MW'. */
	powerUnit?: PowerUnit;
}
