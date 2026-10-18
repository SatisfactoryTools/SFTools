import {Component, ChangeDetectionStrategy} from '@angular/core';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';
import {CommunityLinks} from '@src/Model/CommunityLinks';

@Component({
	templateUrl: './NotFoundComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [BackLinkComponent],
})
export class NotFoundComponent
{

	public readonly discordUrl = CommunityLinks.DISCORD.url;

}
