/** How a mod entry field is edited and validated. */
export type ModFieldKind =
	| 'text'
	| 'multiline'
	| 'number'
	| 'boolean'
	| 'enum'
	| 'color'
	| 'stringList'
	| 'itemAmounts'
	| 'fuels'
	| 'image'
	| 'json';
