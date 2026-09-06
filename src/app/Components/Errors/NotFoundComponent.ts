import {Component, ChangeDetectionStrategy} from '@angular/core';
import {BackLinkComponent} from '@src/Components/Common/BackLinkComponent';

@Component({
	templateUrl: './NotFoundComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [BackLinkComponent],
})
export class NotFoundComponent
{

}
