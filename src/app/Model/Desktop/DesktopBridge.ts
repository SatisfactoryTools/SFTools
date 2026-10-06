import {DesktopInfo} from '@src/Model/Desktop/DesktopInfo';
import {TauriGlobal} from '@src/Model/Desktop/TauriGlobal';

/**
 * Only provided in the desktop app (by value from main.ts, since it exists before Angular does);
 * services take it as an optional dependency and treat null as "web".
 */
export class DesktopBridge
{

	private constructor(
		private readonly tauri: TauriGlobal,
		public readonly info: DesktopInfo,
	)
	{
	}

	public static async connect(apiUrl: string): Promise<DesktopBridge | null>
	{
		const tauri = (window as unknown as {__TAURI__?: TauriGlobal}).__TAURI__;
		if (tauri === undefined) {
			return null;
		}
		const info = await tauri.core.invoke<DesktopInfo>('desktop_init', {apiUrl});
		return new DesktopBridge(tauri, info);
	}

	public invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>
	{
		return this.tauri.core.invoke<T>(command, args);
	}

	public listen<T>(event: string, handler: (payload: T) => void): Promise<() => void>
	{
		return this.tauri.event.listen<T>(event, message => handler(message.payload));
	}

	public openExternal(url: string): void
	{
		this.invoke('open_external', {url}).catch(error => console.error(`Could not open ${url}:`, error));
	}

	public async saveDownload(blob: Blob, fileName: string): Promise<string>
	{
		const bytes = new Uint8Array(await blob.arrayBuffer());
		return this.tauri.core.invoke<string>('export_save', bytes, {headers: {'x-file-name': encodeURIComponent(fileName)}});
	}

}
