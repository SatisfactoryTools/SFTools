/**
 * Pixel widths of the chrome overlaying each side of the planner canvas
 * (icon rail, docked panels, status bar, mobile nav).
 */
export interface CanvasInsets
{
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}
