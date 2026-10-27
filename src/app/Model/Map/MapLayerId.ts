/** `clusters`, `usedOnly` and `spotLinks` are switches, not layers: they ride along because the layer state is what the URL keeps. */
export type MapLayerId = 'nodes' | 'slugs' | 'artifacts' | 'drives' | 'plants' | 'items' | 'creatures' | 'area' | 'sites' | 'taken' | 'players'
	| 'collected' | 'spots' | 'clusters' | 'usedOnly' | 'spotLinks';
