import {Injectable, signal} from '@angular/core';
import {HelpImage} from '@src/Model/Help/HelpImage';

@Injectable({providedIn: 'root'})
export class HelpImageViewerService
{

	private readonly imageSignal = signal<HelpImage | null>(null);

	public readonly image = this.imageSignal.asReadonly();

	public open(image: HelpImage): void
	{
		this.imageSignal.set(image);
	}

	public close(): void
	{
		this.imageSignal.set(null);
	}

}
