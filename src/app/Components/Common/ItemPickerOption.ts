/** One choice in an ItemPickerComponent: the stored value, its display label and an optional icon hash. */
export interface ItemPickerOption
{

	readonly value: string;

	readonly label: string;

	readonly iconHash: string | null;

	/** Rendered struck through and dimmed - the plan cannot currently produce this item. */
	readonly strike?: boolean;

}
