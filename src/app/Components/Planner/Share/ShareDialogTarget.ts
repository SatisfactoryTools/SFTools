import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';

/** What the share window is open for - one plan or folder row. */
export interface ShareDialogTarget
{
	readonly type: ShareType;
	readonly id: string;
	/** Shown in the window title; already display-resolved (unnamed plans included). */
	readonly name: string;
	/** True for a row of "Plans on this device" - it has no link of its own, only snapshots. */
	readonly device: boolean;
}
