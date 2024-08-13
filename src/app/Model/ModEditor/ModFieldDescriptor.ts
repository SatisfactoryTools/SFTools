import {ModFieldKind} from '@src/Model/ModEditor/ModFieldKind';
import {ModFieldOption} from '@src/Model/ModEditor/ModFieldOption';
import {ModJsonShape} from '@src/Model/ModEditor/ModJsonShape';

/**
 * One editable field of a mod entry. The descriptor tables drive both the
 * clickable forms and the JSON validator, so the two cannot drift apart.
 */
export interface ModFieldDescriptor
{
	/** The JSON key, exactly as in the Data schema. */
	readonly key: string;
	readonly label: string;
	readonly kind: ModFieldKind;
	/** Required fields show in the main form; the rest fold into "More fields". */
	readonly required?: boolean;
	/** The value may be null (empty text inputs store null). */
	readonly nullable?: boolean;
	/** Choices for kind 'enum'. */
	readonly options?: ModFieldOption[];
	/** Sub-object structure for kind 'json'. */
	readonly jsonShape?: ModJsonShape;
	/** New-entry default; the kind's zero value when omitted. */
	readonly defaultValue?: unknown;
	readonly help?: string;
}
