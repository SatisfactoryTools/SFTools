/** A node marked taken or free, or a collectible marked collected or not, by hand on the map. */
export interface MapMarkToggle
{
	readonly id: string;
	readonly kind: 'taken' | 'collected';
	readonly on: boolean;
}
