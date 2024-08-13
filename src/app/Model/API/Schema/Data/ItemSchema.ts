import {ColorSchema} from '@src/Model/API/Schema/Data/Parts/ColorSchema';
import {EquipSlot} from '@src/Model/API/Schema/Data/Parts/EquipSlot';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {StackSize} from '@src/Model/API/Schema/Data/Parts/StackSize';

export interface ItemSchema
{

	className: string;
	icon: string | null;
	name: string;
	description: string;
	abbr: string | null;
	canBeTrashed: boolean;
	energy: number;
	radioactiveDecay: number;
	form: ItemForm;
	smallIcon: string;
	bigIcon: string;
	fluidColor: ColorSchema;
	gasColor: ColorSchema;
	sinkPoints: number;
	stackSize: StackSize;
	consumable: boolean;
	healthGain: number;
	isBiomass: boolean;
	isAlien: boolean;
	equipSlot: EquipSlot;
	compatibleWeapons: string[];
	compatibleAmmo: string[];
	magazineSize: number;
	fireRate: number;
	minShots: number;
	maxShots: number;
	reloadTime: number;

}
