import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';
import {ShareVersion} from '@src/Model/API/Schema/Shares/ShareVersion';

/**
 * An entry of the "Shared plans" list: a share link the user has opened.
 * The metadata is a snapshot of the (frozen) share record - the server
 * re-resolves it on every list fetch, localStorage keeps the visit-time copy.
 */
export interface VisitedShare
{
	readonly share: string;
	readonly type: ShareType;
	readonly name: string;
	readonly sharedAt: string;
	readonly visitedAt: string;
	readonly version: ShareVersion;
	/**
	 * A plan share's icon class name (its chosen icon, else its first
	 * product); null = none, undefined = unknown (folder shares, and rows
	 * from the API) - then the ShareTreeCache snapshot supplies it.
	 */
	readonly iconClassName?: string | null;
}
