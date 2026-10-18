import {PlanConversion} from '@src/Model/PlanFiles/Conversion/PlanConversion';
import {PlanFile} from '@src/Model/PlanFiles/PlanFile';

export interface PlanImportPreview
{
	readonly file: PlanFile;
	readonly sameVersion: boolean;
	/** False when the file's version could not be loaded: changed recipes went undetected. */
	readonly sourceLoaded: boolean;
	readonly conversion: PlanConversion;
	/** The new ids of the file's top-level entries, in file order. */
	readonly roots: readonly {readonly id: string; readonly type: 'plan' | 'folder'}[];
}
