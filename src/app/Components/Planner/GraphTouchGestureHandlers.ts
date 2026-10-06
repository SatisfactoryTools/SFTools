export interface GraphTouchGestureHandlers
{

	isCellElement(target: Element): boolean;

	onTouchUsed(): void;

	onPan(dx: number, dy: number): void;

	onPinch(factor: number, clientX: number, clientY: number): void;

	onDoubleTap(clientX: number, clientY: number, target: Element): void;

	onLongPress(clientX: number, clientY: number, target: Element): void;

}
