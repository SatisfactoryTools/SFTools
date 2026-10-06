import {ModFieldKind} from '@src/Model/ModEditor/ModFieldKind';
import {ModFieldOption} from '@src/Model/ModEditor/ModFieldOption';
import {ModJsonShape} from '@src/Model/ModEditor/ModJsonShape';

export interface ModFieldDescriptor
{
	readonly key: string;
	readonly label: string;
	readonly kind: ModFieldKind;
	readonly required?: boolean;
	readonly nullable?: boolean;
	readonly options?: ModFieldOption[];
	readonly jsonShape?: ModJsonShape;
	readonly defaultValue?: unknown;
	readonly help?: string;
}
