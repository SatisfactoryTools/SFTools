import {BuildingMaterialSchema} from '@src/Model/API/Schema/Data/Parts/BuildingMaterialSchema';
import {FuelSchema} from '@src/Model/API/Schema/Data/Parts/FuelSchema';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';

export interface BuildingSchema
{

	className: string;
	icon: string | null;
	name: string;
	description: string;
	allowColoring: boolean;
	allowPatterning: boolean;
	materials: BuildingMaterialSchema[];
	canOverclock: boolean;
	minOverclock: number;
	maxOverclock: number;
	clockChangePerShard: number;
	canSloop: boolean;
	sloopSlots: number;
	sloopBoost: number;
	width: number;
	height: number;
	manufacturingSpeed: number;
	powerUsage: number;
	powerUsageExponent: number;
	alwaysProducesPower: boolean;
	powerProduction: number;
	fuel: FuelSchema[];
	supplementalToPowerRatio: number;
	acceptedFuel: string[];
	tripPowerCostBase: number;
	tripPowerCostPerMeter: number;
	storageSize: number;
	fuelStorageSize: number;
	allowedResources: string[];
	allowedResourceForms: ItemForm[];
	miningRatePerCycle: number;
	miningCycleLength: number;
	beltSpeed: number;
	maxLength: number;
	lengthPerCost: number;
	isVehicle: boolean;

}
