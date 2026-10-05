/**
 * What an incoming link asked the planner to import from the old Satisfactory
 * Tools: share keys created by the old site's "take my plans" button, and/or
 * the production lines the old site left in this browser's localStorage.
 * Keys meant for the other flavour of the game version (FICSMAS vs regular)
 * are carried along so the dialog can point the user there afterwards.
 */
export interface OldToolsImportRequest
{
	readonly shareKeys: string[];
	/** Load the old site's localStorage lines (only sensible on the old site's own origin). */
	readonly localLines: boolean;
	/** Share keys of lines made for the other flavour of this version (FICSMAS <-> regular). */
	readonly otherFlavourShareKeys: string[];
}
