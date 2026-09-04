/** What the graph does in response to the touch gestures recognised by GraphTouchGestures. */
export interface GraphTouchGestureHandlers
{

	/** Whether a touch on this element lands on a graph cell (x6 handles those itself). */
	isCellElement(target: Element): boolean;

	/** One-finger drag on blank canvas, in client pixels since the last move. */
	onPan(dx: number, dy: number): void;

	/** Two-finger spread/squeeze: multiply the zoom by `factor`, keeping the client point fixed. */
	onPinch(factor: number, clientX: number, clientY: number): void;

	onDoubleTap(clientX: number, clientY: number, target: Element): void;

	onLongPress(clientX: number, clientY: number, target: Element): void;

}
