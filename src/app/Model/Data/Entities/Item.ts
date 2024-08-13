import {ItemSchema} from '@src/Model/API/Schema/Data/ItemSchema';
import {ColorSchema} from '@src/Model/API/Schema/Data/Parts/ColorSchema';
import {EquipSlot} from '@src/Model/API/Schema/Data/Parts/EquipSlot';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {StackSize} from '@src/Model/API/Schema/Data/Parts/StackSize';

export class Item
{

	public readonly className: string;
	public readonly icon: string | null;
	public readonly name: string;
	public readonly description: string;
	public readonly abbr: string | null;
	public readonly canBeTrashed: boolean;
	public readonly energy: number;
	public readonly radioactiveDecay: number;
	public readonly form: ItemForm;
	public readonly smallIcon: string;
	public readonly bigIcon: string;
	public readonly fluidColor: ColorSchema;
	public readonly gasColor: ColorSchema;
	public readonly sinkPoints: number;
	public readonly stackSize: StackSize;
	public readonly consumable: boolean;
	public readonly healthGain: number;
	public readonly isBiomass: boolean;
	public readonly isAlien: boolean;
	public readonly equipSlot: EquipSlot;
	public readonly compatibleWeapons: string[];
	public readonly compatibleAmmo: string[];
	public readonly magazineSize: number;
	public readonly fireRate: number;
	public readonly minShots: number;
	public readonly maxShots: number;
	public readonly reloadTime: number;

	public constructor(schema: ItemSchema)
	{
		this.className = schema.className;
		this.icon = schema.icon;
		this.name = schema.name;
		this.description = schema.description;
		this.abbr = schema.abbr;
		this.canBeTrashed = schema.canBeTrashed;
		this.energy = schema.energy;
		this.radioactiveDecay = schema.radioactiveDecay;
		this.form = schema.form;
		this.smallIcon = schema.smallIcon;
		this.bigIcon = schema.bigIcon;
		this.fluidColor = schema.fluidColor;
		this.gasColor = schema.gasColor;
		this.sinkPoints = schema.sinkPoints;
		this.stackSize = schema.stackSize;
		this.consumable = schema.consumable;
		this.healthGain = schema.healthGain;
		this.isBiomass = schema.isBiomass;
		this.isAlien = schema.isAlien;
		this.equipSlot = schema.equipSlot;
		this.compatibleWeapons = schema.compatibleWeapons;
		this.compatibleAmmo = schema.compatibleAmmo;
		this.magazineSize = schema.magazineSize;
		this.fireRate = schema.fireRate;
		this.minShots = schema.minShots;
		this.maxShots = schema.maxShots;
		this.reloadTime = schema.reloadTime;
	}

}
