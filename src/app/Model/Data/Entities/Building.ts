import {BuildingSchema} from '@src/Model/API/Schema/Data/BuildingSchema';
import {BuildingMaterialSchema} from '@src/Model/API/Schema/Data/Parts/BuildingMaterialSchema';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';
import {Item} from '@src/Model/Data/Entities/Item';

export class Building
{

	public readonly className: string;
	public readonly icon: string | null;
	public readonly name: string;
	public readonly description: string;
	public readonly allowColoring: boolean;
	public readonly allowPatterning: boolean;
	public readonly materials: BuildingMaterialSchema[];
	public readonly canOverclock: boolean;
	public readonly minOverclock: number;
	public readonly maxOverclock: number;
	public readonly clockChangePerShard: number;
	public readonly canSloop: boolean;
	public readonly sloopSlots: number;
	public readonly sloopBoost: number;
	public readonly width: number;
	public readonly height: number;
	public readonly manufacturingSpeed: number;
	public readonly powerUsage: number;
	public readonly powerUsageExponent: number;
	public readonly alwaysProducesPower: boolean;
	public readonly powerProduction: number;
	public readonly fuel: Fuel[];
	public readonly supplementalToPowerRatio: number;
	public readonly acceptedFuel: Item[];
	public readonly tripPowerCostBase: number;
	public readonly tripPowerCostPerMeter: number;
	public readonly storageSize: number;
	public readonly fuelStorageSize: number;
	public readonly allowedResources: Item[];
	public readonly allowedResourceForms: ItemForm[];
	public readonly miningRatePerCycle: number;
	public readonly miningCycleLength: number;
	public readonly beltSpeed: number;
	public readonly maxLength: number;
	public readonly lengthPerCost: number;
	public readonly isVehicle: boolean;

	public constructor(schema: BuildingSchema, itemMap: Map<string, Item>)
	{
		this.className = schema.className;
		this.icon = schema.icon;
		this.name = schema.name;
		this.description = schema.description;
		this.allowColoring = schema.allowColoring;
		this.allowPatterning = schema.allowPatterning;
		this.materials = schema.materials;
		this.canOverclock = schema.canOverclock;
		this.minOverclock = schema.minOverclock;
		this.maxOverclock = schema.maxOverclock;
		this.clockChangePerShard = schema.clockChangePerShard;
		this.canSloop = schema.canSloop;
		this.sloopSlots = schema.sloopSlots;
		this.sloopBoost = schema.sloopBoost;
		this.width = schema.width;
		this.height = schema.height;
		this.manufacturingSpeed = schema.manufacturingSpeed;
		this.powerUsage = schema.powerUsage;
		this.powerUsageExponent = schema.powerUsageExponent;
		this.alwaysProducesPower = schema.alwaysProducesPower;
		this.powerProduction = schema.powerProduction;
		this.fuel = schema.fuel.map(f => ({
			item: itemMap.get(f.item)!,
			supplementalItem: f.supplementalItem ? itemMap.get(f.supplementalItem)! : null,
			byproduct: f.byproduct ? itemMap.get(f.byproduct)! : null,
			byproductAmount: f.byproductAmount,
			acceptsAnySolidFuel: f.acceptsAnySolidFuel,
		}));
		this.supplementalToPowerRatio = schema.supplementalToPowerRatio;
		this.acceptedFuel = schema.acceptedFuel.map(cn => itemMap.get(cn)!);
		this.tripPowerCostBase = schema.tripPowerCostBase;
		this.tripPowerCostPerMeter = schema.tripPowerCostPerMeter;
		this.storageSize = schema.storageSize;
		this.fuelStorageSize = schema.fuelStorageSize;
		this.allowedResources = schema.allowedResources.map(cn => itemMap.get(cn)!);
		this.allowedResourceForms = schema.allowedResourceForms;
		this.miningRatePerCycle = schema.miningRatePerCycle;
		this.miningCycleLength = schema.miningCycleLength;
		this.beltSpeed = schema.beltSpeed;
		this.maxLength = schema.maxLength;
		this.lengthPerCost = schema.lengthPerCost;
		this.isVehicle = schema.isVehicle;
	}

}
