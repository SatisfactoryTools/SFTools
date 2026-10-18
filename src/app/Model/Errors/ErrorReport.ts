import {ErrorKind} from '@src/Model/Errors/ErrorKind';

export interface ErrorReport
{

	readonly kind: Exclude<ErrorKind, 'ignore'>;

	/** Repeats of one error share it, so they are counted instead of listed. */
	readonly signature: string;

	readonly details: string;

}
