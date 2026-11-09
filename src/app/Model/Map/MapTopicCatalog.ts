import {MapLayerCodec} from '@src/Model/Map/MapLayerCodec';
import {MapLayerState} from '@src/Model/Map/MapLayerState';
import {MapTopic} from '@src/Model/Map/MapTopic';

/** Mirrors tools-api app/Model/Services/Meta/MapTopicCatalog.php: keep the texts in sync. */
export class MapTopicCatalog
{

	public static readonly MAP_HEADING = 'Interactive map';
	public static readonly MAP_DESCRIPTION = 'Interactive map of Satisfactory ({V}) with every resource node, well and geyser, plus power slugs, Somersloops, Mercer Spheres, hard drives, plants and creatures.';

	private static readonly COLLECTED = ' Load your save to mark what you have already collected.';

	private static readonly ARTIFACTS: ReadonlyArray<string> = ['somersloop', 'mercer'];

	/** [slug, resource key, name] for the resources shown as nodes. */
	private static readonly NODE_RESOURCES: ReadonlyArray<[string, string, string]> = [
		['iron-ore', 'OreIron', 'Iron Ore'],
		['copper-ore', 'OreCopper', 'Copper Ore'],
		['limestone', 'Stone', 'Limestone'],
		['coal', 'Coal', 'Coal'],
		['caterium-ore', 'OreGold', 'Caterium Ore'],
		['raw-quartz', 'RawQuartz', 'Raw Quartz'],
		['sulfur', 'Sulfur', 'Sulfur'],
		['bauxite', 'OreBauxite', 'Bauxite'],
		['uranium', 'OreUranium', 'Uranium'],
		['sam', 'SAM', 'SAM'],
	];

	public static readonly TOPICS: ReadonlyArray<MapTopic> = [
		new MapTopic('somersloops', 'Somersloops', 'Somersloop locations', 'Every Somersloop in Satisfactory ({V}) on an interactive map.' + MapTopicCatalog.COLLECTED, 'artifacts', ['somersloop']),
		new MapTopic('mercer-spheres', 'Mercer Spheres', 'Mercer Sphere locations', 'Every Mercer Sphere in Satisfactory ({V}) on an interactive map.' + MapTopicCatalog.COLLECTED, 'artifacts', ['mercer']),
		new MapTopic('power-slugs', 'Power slugs', 'Power slug locations', 'Every blue, yellow and purple power slug in Satisfactory ({V}) on an interactive map.' + MapTopicCatalog.COLLECTED, 'slugs'),
		new MapTopic('hard-drives', 'Hard drives', 'Hard drive locations', 'Every crash site with a hard drive in Satisfactory ({V}) on an interactive map.' + MapTopicCatalog.COLLECTED, 'drives'),
		new MapTopic('plants', 'Plants', 'Plant locations', 'Every Paleberry, Beryl Nut and Bacon Agaric in Satisfactory ({V}) on an interactive map.' + MapTopicCatalog.COLLECTED, 'plants'),
		new MapTopic('creatures', 'Creatures', 'Creature locations', 'Where every creature spawns in Satisfactory ({V}), from hogs and stingers to the harmless ones, on an interactive map.', 'creatures'),
		...MapTopicCatalog.NODE_RESOURCES.map(([slug, key, name]) => MapTopicCatalog.resourceTopic(slug, key, name, `${name} nodes`, `Every ${name} node`)),
		MapTopicCatalog.resourceTopic('crude-oil', 'LiquidOil', 'Crude Oil', 'Crude Oil nodes and wells', 'Every Crude Oil node and resource well'),
		MapTopicCatalog.resourceTopic('water', 'Water', 'Water', 'Water wells', 'Every Water resource well'),
		MapTopicCatalog.resourceTopic('nitrogen-gas', 'NitrogenGas', 'Nitrogen Gas', 'Nitrogen Gas wells', 'Every Nitrogen Gas resource well'),
		MapTopicCatalog.resourceTopic('geysers', 'geyser', 'Geysers', 'Geyser locations', 'Every geyser'),
	];

	public static collectibles(): MapTopic[]
	{
		return MapTopicCatalog.TOPICS.filter(topic => topic.layer !== 'nodes');
	}

	public static resources(): MapTopic[]
	{
		return MapTopicCatalog.TOPICS.filter(topic => topic.layer === 'nodes');
	}

	public static find(slug: string): MapTopic | null
	{
		return MapTopicCatalog.TOPICS.find(topic => topic.slug === slug) ?? null;
	}

	/** The layers the topic's page starts with; the visitor's personal layers (area, taken nodes, ...) stay as by default. */
	public static layers(topic: MapTopic): MapLayerState
	{
		let state = MapLayerState.default().withLayer('nodes', false).withLayer(topic.layer, true);
		if (topic.shownCategories !== null) {
			const shown = topic.shownCategories;
			state = state.withShown(MapTopicCatalog.layerCategories(topic).filter(category => !shown.includes(category)), false);
		}
		return state;
	}

	private static layerCategories(topic: MapTopic): ReadonlyArray<string>
	{
		if (topic.layer === 'artifacts') {
			return MapTopicCatalog.ARTIFACTS;
		}
		return MapLayerCodec.RESOURCES.flatMap(resource => MapLayerCodec.PURITIES.map(purity => `${resource}.${purity}`));
	}

	private static resourceTopic(slug: string, key: string, label: string, heading: string, subject: string): MapTopic
	{
		return new MapTopic(
			slug,
			label,
			heading,
			`${subject} in Satisfactory ({V}) and its purity, on an interactive map.`,
			'nodes',
			MapLayerCodec.PURITIES.map(purity => `${key}.${purity}`),
		);
	}

}
