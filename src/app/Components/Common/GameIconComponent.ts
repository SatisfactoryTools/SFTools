import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {IconUrlService} from '@src/Model/Data/IconUrlService';

/**
 * Renders a game icon (item, building, …) from its hash. Nothing is rendered
 * when the hash is missing, so it is safe to drop in beside any name. The
 * display size drives which asset is fetched: 64px for anything up to 64,
 * the crisp 256px asset above that.
 */
@Component({
	selector: 'game-icon',
	templateUrl: './GameIconComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
})
export class GameIconComponent
{

	@Input() public hash: string | null = null;
	@Input() public size = 24;
	@Input() public alt = '';

	public constructor(private readonly iconUrls: IconUrlService)
	{
	}

	public get src(): string | null
	{
		return this.iconUrls.url(this.hash, this.size > 64 ? 256 : 64);
	}

}
