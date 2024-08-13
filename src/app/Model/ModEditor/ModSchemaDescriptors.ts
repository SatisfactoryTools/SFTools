import {DataSchema} from '@src/Model/API/Schema/Data/DataSchema';
import {ModEntryDescriptor} from '@src/Model/ModEditor/ModEntryDescriptor';
import {ModFieldDescriptor} from '@src/Model/ModEditor/ModFieldDescriptor';
import {ModFieldOption} from '@src/Model/ModEditor/ModFieldOption';

const ITEM_FORMS: ModFieldOption[] = [
	{value: 'solid', label: 'Solid'},
	{value: 'liquid', label: 'Liquid'},
	{value: 'gas', label: 'Gas'},
];

const STACK_SIZES: ModFieldOption[] = [
	{value: 0, label: 'None (0)'},
	{value: 1, label: 'One (1)'},
	{value: 50, label: 'Small (50)'},
	{value: 100, label: 'Medium (100)'},
	{value: 200, label: 'Big (200)'},
	{value: 500, label: 'Huge (500)'},
	{value: 50000, label: 'Fluid (50 000)'},
];

const EQUIP_SLOTS: ModFieldOption[] = [
	{value: '', label: 'None'},
	{value: 'arms', label: 'Arms'},
	{value: 'body', label: 'Body'},
	{value: 'legs', label: 'Legs'},
	{value: 'back', label: 'Back'},
];

const SCHEMATIC_TYPES: ModFieldOption[] = [
	{value: 'custom', label: 'Custom'},
	{value: 'milestone', label: 'Milestone'},
	{value: 'MAM', label: 'MAM'},
	{value: 'alternate', label: 'Alternate'},
	{value: 'hardDrive', label: 'Hard drive'},
	{value: 'tutorial', label: 'Tutorial'},
	{value: 'resourceSink', label: 'AWESOME Sink'},
	{value: 'customisation', label: 'Customisation'},
];

const EVENTS_HELP = 'Event tags, comma-separated; the game only knows "ficsmas".';

/**
 * The mod editor's description of the Data schema: one descriptor per entry
 * collection, listing every field with its editing kind. Fields marked
 * required form the main part of the entry form (they are what the site
 * needs to function); everything else folds into "More fields" and gets a
 * sensible default, so the editor always emits complete schema entries.
 */
export class ModSchemaDescriptors
{

	public static readonly ITEMS: ModEntryDescriptor = {
		collection: 'items',
		label: 'Items',
		singular: 'item',
		classNamePrefix: 'Desc_',
		fields: [
			{key: 'name', label: 'Name', kind: 'text', required: true},
			{key: 'description', label: 'Description', kind: 'multiline', required: true},
			{key: 'form', label: 'Form', kind: 'enum', options: ITEM_FORMS, required: true},
			{key: 'stackSize', label: 'Stack size', kind: 'enum', options: STACK_SIZES, required: true, defaultValue: 100},
			{key: 'sinkPoints', label: 'Sink points', kind: 'number', required: true},
			{key: 'energy', label: 'Energy (MJ)', kind: 'number', required: true, help: 'Energy released when burnt as fuel; 0 for non-fuels.'},
			{key: 'icon', label: 'Icon', kind: 'image', nullable: true, required: true},
			{key: 'abbr', label: 'Abbreviation', kind: 'text', nullable: true},
			{key: 'canBeTrashed', label: 'Can be trashed', kind: 'boolean', defaultValue: true},
			{key: 'radioactiveDecay', label: 'Radioactive decay', kind: 'number'},
			{key: 'smallIcon', label: 'Small icon', kind: 'image'},
			{key: 'bigIcon', label: 'Big icon', kind: 'image'},
			{key: 'fluidColor', label: 'Fluid color', kind: 'color'},
			{key: 'gasColor', label: 'Gas color', kind: 'color'},
			{key: 'consumable', label: 'Consumable', kind: 'boolean'},
			{key: 'healthGain', label: 'Health gain', kind: 'number'},
			{key: 'isBiomass', label: 'Is biomass', kind: 'boolean'},
			{key: 'isAlien', label: 'Is alien', kind: 'boolean'},
			{key: 'equipSlot', label: 'Equip slot', kind: 'enum', options: EQUIP_SLOTS},
			{key: 'compatibleWeapons', label: 'Compatible weapons', kind: 'stringList'},
			{key: 'compatibleAmmo', label: 'Compatible ammo', kind: 'stringList'},
			{key: 'magazineSize', label: 'Magazine size', kind: 'number'},
			{key: 'fireRate', label: 'Fire rate', kind: 'number'},
			{key: 'minShots', label: 'Min shots', kind: 'number'},
			{key: 'maxShots', label: 'Max shots', kind: 'number'},
			{key: 'reloadTime', label: 'Reload time (s)', kind: 'number'},
		],
	};

	public static readonly RECIPES: ModEntryDescriptor = {
		collection: 'recipes',
		label: 'Recipes',
		singular: 'recipe',
		classNamePrefix: 'Recipe_',
		fields: [
			{key: 'name', label: 'Name', kind: 'text', required: true},
			{key: 'ingredients', label: 'Ingredients (per cycle)', kind: 'itemAmounts', required: true},
			{key: 'products', label: 'Products (per cycle)', kind: 'itemAmounts', required: true},
			{key: 'producedIn', label: 'Produced in', kind: 'stringList', required: true, help: 'Building classNames, comma-separated.'},
			{key: 'time', label: 'Cycle time (s)', kind: 'number', required: true, defaultValue: 6},
			{key: 'alternate', label: 'Alternate recipe', kind: 'boolean'},
			{key: 'manualCraftingMultiplier', label: 'Manual crafting multiplier', kind: 'number', defaultValue: 1},
			{key: 'inBuildGun', label: 'In build gun', kind: 'boolean'},
			{key: 'inCraftBench', label: 'In craft bench', kind: 'boolean'},
			{key: 'inEquipmentWorkshop', label: 'In equipment workshop', kind: 'boolean'},
			{key: 'variablePowerDraw', label: 'Variable power draw', kind: 'boolean'},
			{key: 'variablePowerDrawConstant', label: 'Variable power constant', kind: 'number'},
			{key: 'variablePowerDrawFactor', label: 'Variable power factor', kind: 'number', defaultValue: 1},
			{key: 'events', label: 'Events', kind: 'stringList', help: EVENTS_HELP},
		],
	};

	public static readonly BUILDINGS: ModEntryDescriptor = {
		collection: 'buildings',
		label: 'Buildings',
		singular: 'building',
		classNamePrefix: 'Desc_',
		fields: [
			{key: 'name', label: 'Name', kind: 'text', required: true},
			{key: 'description', label: 'Description', kind: 'multiline', required: true},
			{key: 'icon', label: 'Icon', kind: 'image', nullable: true, required: true},
			{key: 'manufacturingSpeed', label: 'Manufacturing speed', kind: 'number', required: true, defaultValue: 1},
			{key: 'powerUsage', label: 'Power usage (MW)', kind: 'number', required: true},
			{key: 'canOverclock', label: 'Can overclock', kind: 'boolean', defaultValue: true},
			{key: 'minOverclock', label: 'Min overclock (%)', kind: 'number', defaultValue: 1},
			{key: 'maxOverclock', label: 'Max overclock (%)', kind: 'number', defaultValue: 250},
			{key: 'clockChangePerShard', label: 'Clock change per shard (%)', kind: 'number', defaultValue: 50},
			{key: 'canSloop', label: 'Can somersloop', kind: 'boolean'},
			{key: 'sloopSlots', label: 'Somersloop slots', kind: 'number'},
			{key: 'sloopBoost', label: 'Somersloop boost', kind: 'number', defaultValue: 1},
			{key: 'powerUsageExponent', label: 'Power usage exponent', kind: 'number', defaultValue: 1.6},
			{key: 'alwaysProducesPower', label: 'Always produces power', kind: 'boolean'},
			{key: 'powerProduction', label: 'Power production (MW)', kind: 'number'},
			{key: 'fuel', label: 'Fuel', kind: 'fuels'},
			{key: 'supplementalToPowerRatio', label: 'Supplemental to power ratio', kind: 'number'},
			{key: 'acceptedFuel', label: 'Accepted fuel', kind: 'stringList'},
			{key: 'width', label: 'Width (m)', kind: 'number'},
			{key: 'height', label: 'Height (m)', kind: 'number'},
			{key: 'allowColoring', label: 'Allow coloring', kind: 'boolean', defaultValue: true},
			{key: 'allowPatterning', label: 'Allow patterning', kind: 'boolean', defaultValue: true},
			{key: 'materials', label: 'Build materials', kind: 'json', jsonShape: 'buildingMaterials', defaultValue: [], help: 'Array of {"material", "recipe"} pairs.'},
			{key: 'tripPowerCostBase', label: 'Trip power cost base', kind: 'number'},
			{key: 'tripPowerCostPerMeter', label: 'Trip power cost per meter', kind: 'number'},
			{key: 'storageSize', label: 'Storage size', kind: 'number'},
			{key: 'fuelStorageSize', label: 'Fuel storage size', kind: 'number'},
			{key: 'allowedResources', label: 'Allowed resources', kind: 'stringList'},
			{key: 'allowedResourceForms', label: 'Allowed resource forms', kind: 'stringList', help: 'solid, liquid and/or gas, comma-separated.'},
			{key: 'miningRatePerCycle', label: 'Mining rate per cycle', kind: 'number'},
			{key: 'miningCycleLength', label: 'Mining cycle length (s)', kind: 'number'},
			{key: 'beltSpeed', label: 'Belt speed', kind: 'number'},
			{key: 'maxLength', label: 'Max length', kind: 'number'},
			{key: 'lengthPerCost', label: 'Length per cost', kind: 'number'},
			{key: 'isVehicle', label: 'Is vehicle', kind: 'boolean'},
		],
	};

	public static readonly SCHEMATICS: ModEntryDescriptor = {
		collection: 'schematics',
		label: 'Schematics',
		singular: 'schematic',
		classNamePrefix: 'Schematic_',
		fields: [
			{key: 'name', label: 'Name', kind: 'text', required: true},
			{key: 'type', label: 'Type', kind: 'enum', options: SCHEMATIC_TYPES, required: true},
			{key: 'tier', label: 'Tier', kind: 'number', required: true},
			{key: 'cost', label: 'Cost', kind: 'itemAmounts', required: true},
			{key: 'time', label: 'Time (s)', kind: 'number', required: true},
			{
				key: 'unlock', label: 'Unlocks', kind: 'json', jsonShape: 'unlock', required: true,
				defaultValue: {recipes: [], schematics: [], items: [], scannableObjects: [], scannableResources: [], tapes: [], emotes: [], inventorySlots: 0, equipmentSlots: 0},
				help: 'Most mods only fill "recipes".',
			},
			{key: 'description', label: 'Description', kind: 'multiline'},
			{key: 'icon', label: 'Icon', kind: 'image', nullable: true},
			{
				key: 'dependency', label: 'Dependency', kind: 'json', jsonShape: 'dependency',
				defaultValue: {schematics: [], gamePhase: null, requireAll: false},
			},
			{key: 'dependenciesBlockAccess', label: 'Dependencies block access', kind: 'boolean'},
			{key: 'dependenciesHide', label: 'Dependencies hide', kind: 'boolean'},
			{key: 'events', label: 'Events', kind: 'stringList', help: EVENTS_HELP},
		],
	};

	public static readonly MATERIALS: ModEntryDescriptor = {
		collection: 'materials',
		label: 'Materials',
		singular: 'material',
		classNamePrefix: 'Recipe_',
		fields: [
			{key: 'ingredients', label: 'Ingredients', kind: 'itemAmounts', required: true},
			{key: 'events', label: 'Events', kind: 'stringList', help: EVENTS_HELP},
		],
	};

	public static readonly ALL: ModEntryDescriptor[] = [
		ModSchemaDescriptors.ITEMS,
		ModSchemaDescriptors.RECIPES,
		ModSchemaDescriptors.BUILDINGS,
		ModSchemaDescriptors.SCHEMATICS,
		ModSchemaDescriptors.MATERIALS,
	];

	/** An empty mod: all collections present so entries can be added anywhere. */
	public static emptyData(): DataSchema
	{
		return {items: {}, schematics: {}, recipes: {}, buildings: {}, materials: {}, resources: []};
	}

	/** A complete entry with every schema field at its default. */
	public static createDefault(descriptor: ModEntryDescriptor, className: string): Record<string, unknown>
	{
		const entry: Record<string, unknown> = {className};
		descriptor.fields.forEach(field => {
			entry[field.key] = structuredClone(field.defaultValue ?? ModSchemaDescriptors.zeroValue(field));
		});
		return entry;
	}

	private static zeroValue(field: ModFieldDescriptor): unknown
	{
		switch (field.kind) {
			case 'text':
			case 'multiline':
			case 'image':
				return field.nullable ? null : '';
			case 'number':
				return 0;
			case 'boolean':
				return false;
			case 'enum':
				return field.options?.[0]?.value ?? '';
			case 'color':
				return {r: 255, g: 255, b: 255, a: 0};
			case 'stringList':
			case 'itemAmounts':
			case 'fuels':
				return [];
			case 'json':
				return {};
		}
	}

}
