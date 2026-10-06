export interface SaveFileWorkerRequest
{
	readonly fileName: string;
	readonly buffer: ArrayBuffer;
}
