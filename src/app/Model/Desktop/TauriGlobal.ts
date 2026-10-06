export interface TauriGlobal
{

	readonly core: {
		/** A `Uint8Array` payload is sent as the raw request body; the command then reads its arguments from `headers`. */
		invoke<T>(command: string, args?: Record<string, unknown> | Uint8Array, options?: {headers?: Record<string, string>}): Promise<T>;
	};

	readonly event: {
		listen<T>(event: string, handler: (event: {payload: T}) => void): Promise<() => void>;
	};

}
