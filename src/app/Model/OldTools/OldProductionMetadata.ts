/**
 * Metadata of a production line saved by the old Satisfactory Tools
 * (satisfactorytools.com). Name and icon are null until the user set them -
 * the old app derived both from the first requested item.
 */
export interface OldProductionMetadata
{
	readonly name: string | null;
	/** Item/building class name used as the tab icon. */
	readonly icon: string | null;
	readonly schemaVersion: number;
	readonly gameVersion: string;
}
