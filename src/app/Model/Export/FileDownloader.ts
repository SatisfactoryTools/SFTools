import {Injectable, Optional} from '@angular/core';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';

@Injectable({providedIn: 'root'})
export class FileDownloader
{

	public constructor(@Optional() private readonly desktop: DesktopBridge | null)
	{
	}

	public async download(blob: Blob, fileName: string): Promise<string | null>
	{
		if (this.desktop !== null) {
			return this.desktop.saveDownload(blob, fileName);
		}
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = fileName;
		anchor.click();
		// The click starts the download asynchronously; revoking at once can cancel it.
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
		return null;
	}

	public safeName(name: string, extension: string, fallback: string): string
	{
		const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
		return `${cleaned === '' ? fallback : cleaned}.${extension}`;
	}

}
