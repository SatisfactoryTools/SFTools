import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPreview} from '@src/Model/API/Schema/World/WorldDataPreview';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';

/**
 * The `worldData` object sent with POST /v1/versions - the API stores it
 * verbatim under the version's `metadata.world`. `nodes` echoes the preview
 * response (the source of truth); `limits` are the frontend-derived
 * per-minute resource caps.
 */
export interface WorldDataPayload
{
	seed?: number;
	mode?: WorldDataMode;
	purity?: WorldDataPurity;
	nodes?: WorldDataPreview;
	limits?: Record<string, number>;
}
