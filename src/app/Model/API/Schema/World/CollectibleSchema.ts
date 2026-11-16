import {DropPodUnlockSchema} from '@src/Model/API/Schema/World/DropPodUnlockSchema';

export interface CollectibleSchema
{
	name: string;
	class: string;
	creature?: string;
	item?: string;
	amount?: number;
	location: [number, number, number];
	/** Crash sites only; missing in data extracted before it was read. */
	unlock?: DropPodUnlockSchema;
}
