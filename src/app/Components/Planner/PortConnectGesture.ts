/** A port-drag connect gesture in flight: the node, side and item it started from. */
export interface PortConnectGesture
{
	readonly nodeId: string;
	readonly side: 'in' | 'out';
	readonly itemClassName: string;
}
