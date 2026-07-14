export interface SaveFileWorkerRequest
{
	/** Original file name - only used for parser diagnostics. */
	readonly fileName: string;
	/** Raw .sav file bytes; transferred to the worker, not copied. */
	readonly buffer: ArrayBuffer;
}
