import {MapLayerId} from '@src/Model/Map/MapLayerId';
import {MapLayerState} from '@src/Model/Map/MapLayerState';

/**
 * Packs a layer state into one short URL value: a version character, then base64url bits - one per entry of a fixed list,
 * set where the state differs from the default - then `~id` for hidden ids outside the list (mods).
 */
export class MapLayerCodec
{

	private static readonly VERSION = '1';

	private static readonly EXTRA_SEPARATOR = '~';

	private static readonly LAYERS: ReadonlyArray<MapLayerId> = ['nodes', 'slugs', 'artifacts', 'drives', 'plants', 'items', 'creatures'];

	private static readonly RESOURCES: ReadonlyArray<string> = [
		'OreIron', 'OreCopper', 'Stone', 'Coal', 'OreGold', 'RawQuartz', 'Sulfur', 'OreBauxite', 'OreUranium', 'SAM',
		'LiquidOil', 'Water', 'NitrogenGas', 'geyser',
	];

	private static readonly PURITIES: ReadonlyArray<string> = ['impure', 'normal', 'pure'];

	private static readonly COLLECTIBLE_CATEGORIES: ReadonlyArray<string> = [
		'slug-blue', 'slug-yellow', 'slug-purple', 'somersloop', 'mercer', 'berry', 'nut', 'mushroom',
		'hog', 'spitter', 'stinger', 'beetle', 'creature-other', 'bird', 'doggo', 'giraffe',
	];

	private static readonly SYMBOLS = 'symbols';

	// Links store positions in this list: only ever append to it.
	private static readonly ENTRIES: ReadonlyArray<string> = [
		...MapLayerCodec.LAYERS.map(layer => `layer:${layer}`),
		...MapLayerCodec.RESOURCES.flatMap(resource => MapLayerCodec.PURITIES.map(purity => `${resource}.${purity}`)),
		...MapLayerCodec.COLLECTIBLE_CATEGORIES,
		MapLayerCodec.SYMBOLS,
		'layer:area',
		'layer:sites',
		'layer:taken',
		'layer:players',
		'layer:collected',
		'layer:spots',
		'layer:clusters',
		'layer:usedOnly',
		'layer:spotLinks',
	];

	public encode(state: MapLayerState): string | null
	{
		const defaults = MapLayerState.default();
		if (state.equals(defaults)) {
			return null;
		}

		const bytes = new Uint8Array(Math.ceil(MapLayerCodec.ENTRIES.length / 8));
		MapLayerCodec.ENTRIES.forEach((entry, index) => {
			if (this.value(state, entry) !== this.value(defaults, entry)) {
				bytes[index >> 3] |= 1 << (index & 7);
			}
		});
		const extras = state.hiddenIds().filter(id => !MapLayerCodec.ENTRIES.includes(id));

		let length = bytes.length;
		while (length > 0 && bytes[length - 1] === 0) {
			length--;
		}
		return MapLayerCodec.VERSION
			+ this.toBase64Url(bytes.subarray(0, length))
			+ extras.map(id => MapLayerCodec.EXTRA_SEPARATOR + id).join('');
	}

	public decode(value: string | null): MapLayerState
	{
		let state = MapLayerState.default();
		if (value === null || !value.startsWith(MapLayerCodec.VERSION)) {
			return state;
		}
		const [packed, ...extras] = value.slice(MapLayerCodec.VERSION.length).split(MapLayerCodec.EXTRA_SEPARATOR);
		const bytes = this.fromBase64Url(packed);
		if (bytes === null) {
			return state;
		}

		MapLayerCodec.ENTRIES.forEach((entry, index) => {
			if (((bytes[index >> 3] ?? 0) & (1 << (index & 7))) !== 0) {
				state = this.flip(state, entry);
			}
		});
		return state.withShown(extras.filter(id => id !== ''), false);
	}

	private value(state: MapLayerState, entry: string): boolean
	{
		if (entry.startsWith('layer:')) {
			return state.isLayerOn(entry.slice('layer:'.length) as MapLayerId);
		}
		return entry === MapLayerCodec.SYMBOLS ? state.symbols : state.isShown(entry);
	}

	private flip(state: MapLayerState, entry: string): MapLayerState
	{
		if (entry.startsWith('layer:')) {
			const layer = entry.slice('layer:'.length) as MapLayerId;
			return state.withLayer(layer, !state.isLayerOn(layer));
		}
		if (entry === MapLayerCodec.SYMBOLS) {
			return state.withSymbols(!state.symbols);
		}
		return state.withShown([entry], !state.isShown(entry));
	}

	private toBase64Url(bytes: Uint8Array): string
	{
		let binary = '';
		for (const byte of bytes) {
			binary += String.fromCharCode(byte);
		}
		return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	}

	private fromBase64Url(value: string): Uint8Array | null
	{
		try {
			const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
			return Uint8Array.from(binary, char => char.charCodeAt(0));
		} catch {
			return null;
		}
	}

}
