export interface LabelDrag
{
	readonly cellId: string;
	readonly startClientX: number;
	readonly startClientY: number;
	/** Path length under the pointer at the press, so the label keeps its offset from the pointer instead of jumping onto it. */
	readonly startPointerLength: number;
	readonly startLabelLength: number;
	moved: boolean;
	distance: number;
}
