import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {IconUrlService} from '@src/Model/Data/IconUrlService';

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
