import {PowerUnit} from '@src/Model/Planner/PowerUnit';
import {ProductionRequestMode} from '@src/Model/Planner/ProductionRequestMode';

export interface ProductionRequest
{
	itemClassName: string;
	/** Kept, but ignored, while mode is 'maximise'. */
	ratePerMinute: number;
	/** Absent on requests saved before maximise existed. */
	mode?: ProductionRequestMode;
	/** Input unit only: ratePerMinute stays in MW. */
	powerUnit?: PowerUnit;
}
