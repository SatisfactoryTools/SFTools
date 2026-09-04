import {VisitedShareSchema} from '@src/Model/API/Schema/Shares/VisitedShareSchema';

/** Response of GET /v1/shares/visited - most recently visited first. */
export interface VisitedSharesResponse
{
	shares: VisitedShareSchema[];
}
