import {MapLayerId} from '@src/Model/Map/MapLayerId';
import {MapShownState} from '@src/Model/Map/MapShownState';

export class MapLayerState
{

	public static readonly DEFAULT_LAYERS: ReadonlyArray<MapLayerId> = ['nodes', 'area', 'taken', 'players', 'spots', 'clusters'];

	public constructor(
		private readonly layers: ReadonlySet<string>,
		private readonly hidden: ReadonlySet<string>,
		public readonly symbols: boolean = false,
	)
	{
	}

	public static default(): MapLayerState
	{
		return new MapLayerState(new Set(MapLayerState.DEFAULT_LAYERS), new Set());
	}

	public isLayerOn(id: MapLayerId): boolean
	{
		return this.layers.has(id);
	}

	public anyLayerOn(ids: ReadonlyArray<MapLayerId>): boolean
	{
		return ids.some(id => this.layers.has(id));
	}

	public isShown(category: string): boolean
	{
		return !this.hidden.has(category);
	}

	public shownState(categories: ReadonlyArray<string>): MapShownState
	{
		const shown = categories.filter(category => !this.hidden.has(category)).length;
		if (shown === categories.length) {
			return 'all';
		}
		return shown === 0 ? 'none' : 'some';
	}

	public hiddenIds(): string[]
	{
		return [...this.hidden];
	}

	public withLayer(id: MapLayerId, on: boolean): MapLayerState
	{
		const layers = new Set(this.layers);
		if (on) {
			layers.add(id);
		} else {
			layers.delete(id);
		}
		return new MapLayerState(layers, this.hidden, this.symbols);
	}

	public withShown(categories: ReadonlyArray<string>, shown: boolean): MapLayerState
	{
		const hidden = new Set(this.hidden);
		for (const category of categories) {
			if (shown) {
				hidden.delete(category);
			} else {
				hidden.add(category);
			}
		}
		return new MapLayerState(this.layers, hidden, this.symbols);
	}

	public withSymbols(symbols: boolean): MapLayerState
	{
		return new MapLayerState(this.layers, this.hidden, symbols);
	}

	public equals(other: MapLayerState): boolean
	{
		return this.key() === other.key();
	}

	private key(): string
	{
		return [...this.layers].sort().join(',') + '|' + [...this.hidden].sort().join(',') + '|' + this.symbols;
	}

}
