/**
 * One node of a share's tree snapshot - just what the plans panel needs to
 * list a share's contents (no plan data). Ids are the sharer's original
 * ones from the payload; they are mapped to the hydrated plans when the
 * share is open.
 */
export interface ShareTreeNode
{
	readonly id: string;
	readonly kind: 'folder' | 'plan';
	readonly name: string;
	/** Plans: the chosen icon (null = none), else the first requested item's class name. */
	readonly iconClassName: string | null;
	/** A folder's subfolders then plans; a plan's subplans. */
	readonly children: ShareTreeNode[];
}
