import {Injectable, signal} from '@angular/core';
import {HelpImage} from '@src/Model/Help/HelpImage';

/**
 * The picture the full-size viewer is showing, if any. Articles are read in
 * several places - the help page, the planner's help panel, the editor's
 * preview - and the viewer itself lives once at the root of the app, above
 * everything else on screen, so this is how the two find each other.
 */
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
