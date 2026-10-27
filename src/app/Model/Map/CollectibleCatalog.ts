import {CollectibleKind} from '@src/Model/Map/CollectibleKind';

export class CollectibleCatalog
{

	public static readonly AGGRESSIVE_COLOR = '#e0523f';
	public static readonly HARMLESS_COLOR = '#4fc46b';

	public static readonly CATEGORY_ORDER: ReadonlyArray<string> = [
		'slug-blue', 'slug-yellow', 'slug-purple', 'somersloop', 'mercer', 'berry', 'nut', 'mushroom',
		'hog', 'spitter', 'stinger', 'beetle', 'creature-other', 'bird', 'doggo', 'giraffe',
	];

	public static readonly SECTION_ORDER: ReadonlyArray<string> = ['', 'Aggressive', 'Harmless'];

	private static readonly PICKUPS: Record<string, CollectibleKind> = {
		BP_Crystal_C: new CollectibleKind('slugs', 'slug-blue', '', 'Blue', 'Desc_Crystal_C', null, null, 'Blue Power Slug', 'Power slug', '#4aa3ff'),
		BP_Crystal_mk2_C: new CollectibleKind('slugs', 'slug-yellow', '', 'Yellow', 'Desc_Crystal_mk2_C', null, null, 'Yellow Power Slug', 'Power slug', '#ffd23f'),
		BP_Crystal_mk3_C: new CollectibleKind('slugs', 'slug-purple', '', 'Purple', 'Desc_Crystal_mk3_C', null, null, 'Purple Power Slug', 'Power slug', '#b05cff'),
		BP_WAT1_C: new CollectibleKind('artifacts', 'somersloop', '', 'Somersloops', 'Desc_WAT1_C', null, null, 'Somersloop', 'Alien artifact', '#ff4d4d'),
		BP_WAT2_C: new CollectibleKind('artifacts', 'mercer', '', 'Mercer Spheres', 'Desc_WAT2_C', null, null, 'Mercer Sphere', 'Alien artifact', '#ff6ad5'),
		BP_BerryBush_C: new CollectibleKind('plants', 'berry', '', 'Paleberry', 'Desc_Berry_C', null, null, 'Paleberry', 'Plant', '#e8457a'),
		BP_NutBush_C: new CollectibleKind('plants', 'nut', '', 'Beryl Nut', 'Desc_Nut_C', null, null, 'Beryl Nut', 'Plant', '#c08a5a'),
		BP_Shroom_01_C: new CollectibleKind('plants', 'mushroom', '', 'Bacon Agaric', 'Desc_Shroom_C', null, null, 'Bacon Agaric', 'Plant', '#a4d65e'),
		FGItemPickup_Spawnable: new CollectibleKind('items', null, '', '', null, 'item', null, 'Item on the ground', 'Item on the ground', '#d9d9d9'),
	};

	private static readonly DROP_POD = new CollectibleKind('drives', null, '', '', null, 'hardDrive', null, 'Crash site', 'Hard drive and loot', '#f2a03d');

	// [section, category label] per category; the in-game names are in string tables the extractor cannot read.
	private static readonly CREATURE_CATEGORIES: Record<string, [string, string]> = {
		'hog': ['Aggressive', 'Hogs'],
		'spitter': ['Aggressive', 'Spitters'],
		'stinger': ['Aggressive', 'Stingers'],
		'beetle': ['Aggressive', 'Beetles'],
		'creature-other': ['Aggressive', 'Other'],
		'bird': ['Harmless', 'Non-flying Birds'],
		'doggo': ['Harmless', 'Lizard Doggos'],
		'giraffe': ['Harmless', 'Space Giraffe-Tick-Penguin-Whale Things'],
	};

	private static readonly CREATURES: Record<string, [string, string]> = {
		Char_Hog_C: ['hog', 'Fluffy-tailed Hog'],
		Char_AlphaHog_C: ['hog', 'Alpha Hog'],
		Char_CliffHog_C: ['hog', 'Cliff Hog'],
		Char_NuclearHog_C: ['hog', 'Nuclear Hog'],
		Char_SpitterForestSmall_C: ['spitter', 'Plasma Spitter'],
		Char_SpitterForestAlpha_C: ['spitter', 'Alpha Plasma Spitter'],
		Char_SpitterForestRedSmall_C: ['spitter', 'Red Plasma Spitter'],
		Char_SpitterForestRedAlpha_C: ['spitter', 'Alpha Red Plasma Spitter'],
		Char_SpitterDesertSmall_C: ['spitter', 'Desert Plasma Spitter'],
		Char_SpitterDesertAlpha_C: ['spitter', 'Alpha Desert Plasma Spitter'],
		Char_SpitterAquaticSmall_C: ['spitter', 'Aquatic Plasma Spitter'],
		Char_SpitterAquaticAlpha_C: ['spitter', 'Alpha Aquatic Plasma Spitter'],
		Char_Stinger_Child_C: ['stinger', 'Small Stinger'],
		Char_Stinger_C: ['stinger', 'Stinger'],
		Char_EliteStinger_C: ['stinger', 'Elite Stinger'],
		Char_Beetle_C: ['beetle', 'Beetle'],
		Char_NonFlyingBird_C: ['bird', 'Non-flying Bird'],
		Char_SpaceRabbit_C: ['doggo', 'Lizard Doggo'],
		Char_SpaceGiraffe_C: ['giraffe', 'Space Giraffe-Tick-Penguin-Whale Thing'],
	};

	public pickup(className: string): CollectibleKind | null
	{
		return CollectibleCatalog.PICKUPS[className] ?? null;
	}

	public dropPod(): CollectibleKind
	{
		return CollectibleCatalog.DROP_POD;
	}

	public creature(className: string | undefined): CollectibleKind
	{
		const known = className === undefined ? undefined : CollectibleCatalog.CREATURES[className];
		const category = known?.[0] ?? 'creature-other';
		const [section, categoryLabel] = CollectibleCatalog.CREATURE_CATEGORIES[category];
		const aggressive = section === 'Aggressive';
		const label = known?.[1] ?? (className ?? 'Creature').replace(/^Char_/, '').replace(/_C$/, '').replace(/_/g, ' ');
		return new CollectibleKind(
			'creatures', category, section, categoryLabel, null, className ?? null, aggressive ? 'hostile' : 'friendly',
			label, aggressive ? 'Aggressive creature spawn' : 'Harmless creature spawn', aggressive ? CollectibleCatalog.AGGRESSIVE_COLOR : CollectibleCatalog.HARMLESS_COLOR,
		);
	}

}
